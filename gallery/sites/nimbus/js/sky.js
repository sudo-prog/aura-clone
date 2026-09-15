/* ============================================================
   NIMBUS · sky.js — the living specimen book
   Six procedural skies, one solar model, one rAF (owned by main.js).
   Each cloud genus is its own fragment shader over a shared prelude.
   ============================================================ */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/* ---------- shared GLSL prelude: noise + solar model ---------- */

const PRELUDE = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uSun;    // sun position, frame fraction (x right, y up)
uniform float uElev;   // solar elevation, degrees
uniform float uFlash;
uniform vec2  uFlashPos;
uniform float uSeed;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = m * p; a *= 0.5; }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) { v += a * vnoise(p); p = m * p; a *= 0.5; }
  return v;
}

/* sky palette keyframed on solar elevation */
void skyCols(out vec3 zen, out vec3 mid, out vec3 hor) {
  float e = uElev;
  zen = vec3(0.055, 0.075, 0.13);
  mid = vec3(0.16, 0.18, 0.26);
  hor = vec3(0.28, 0.25, 0.31);
  float t;
  t = smoothstep(-7.0, 0.5, e);
  zen = mix(zen, vec3(0.22, 0.30, 0.43), t);
  mid = mix(mid, vec3(0.52, 0.48, 0.53), t);
  hor = mix(hor, vec3(0.84, 0.60, 0.53), t);
  t = smoothstep(0.5, 10.0, e);
  zen = mix(zen, vec3(0.33, 0.49, 0.66), t);
  mid = mix(mid, vec3(0.62, 0.71, 0.78), t);
  hor = mix(hor, vec3(0.95, 0.81, 0.69), t);
  t = smoothstep(10.0, 30.0, e);
  zen = mix(zen, vec3(0.16, 0.43, 0.69), t);
  mid = mix(mid, vec3(0.50, 0.68, 0.83), t);
  hor = mix(hor, vec3(0.82, 0.89, 0.93), t);
  t = smoothstep(30.0, 58.0, e);
  zen = mix(zen, vec3(0.12, 0.40, 0.69), t);
  mid = mix(mid, vec3(0.45, 0.66, 0.84), t);
  hor = mix(hor, vec3(0.77, 0.87, 0.93), t);
}
vec3 sunColor() {
  float e = uElev;
  vec3 c = mix(vec3(0.82, 0.38, 0.34), vec3(1.0, 0.55, 0.35), smoothstep(-6.0, 0.0, e));
  c = mix(c, vec3(1.0, 0.78, 0.52), smoothstep(0.0, 14.0, e));
  c = mix(c, vec3(1.0, 0.96, 0.88), smoothstep(15.0, 45.0, e));
  return c;
}
vec3 baseSky(vec2 st, float aspect) {
  vec3 zen, mid, hor;
  skyCols(zen, mid, hor);
  vec3 c = mix(hor, mid, smoothstep(0.02, 0.5, st.y));
  c = mix(c, zen, smoothstep(0.38, 1.05, st.y));
  vec2 d = vec2((st.x - uSun.x) * aspect, st.y - uSun.y);
  float d2 = dot(d, d);
  vec3 sc = sunColor();
  float vis = smoothstep(-8.0, 4.0, uElev);
  float discVis = smoothstep(-0.5, 3.0, uElev); /* the disc sets; the glow lingers */
  c += sc * (exp(-d2 * 3400.0) * 0.95 * discVis   /* a crisp disc */
           + exp(-d2 * 240.0) * 0.22 * discVis    /* its compact halo */
           + exp(-sqrt(d2) * 4.6) * 0.3 * vis);   /* the broad wash */
  return c;
}
vec3 dither(vec3 c, vec2 fc) {
  return c + (hash21(fc + fract(uTime)) - 0.5) * 0.014;
}
`;

/* ---------- genus shaders ---------- */

const SHADERS = {

  /* frontispiece — open sky, high haze, a hint of far cumulus */
  hero: PRELUDE + `
void main() {
  vec2 st = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(st.x * aspect, st.y);
  vec3 col = baseSky(st, aspect);
  vec3 zen, mid, hor; skyCols(zen, mid, hor);
  vec3 sc = sunColor();

  /* last stars, fading with the dawn */
  vec2 sg = floor(p * 26.0 + uSeed);
  vec2 sf = fract(p * 26.0 + uSeed) - 0.5;
  float sh = hash21(sg);
  float starCore = pow(clamp(1.0 - length(sf - (vec2(hash21(sg + 3.1), hash21(sg + 7.7)) - 0.5) * 0.6) * 5.0, 0.0, 1.0), 3.0);
  float tw = 0.7 + 0.3 * sin(uTime * 1.6 + sh * 40.0);
  float nightF = smoothstep(-2.0, -6.5, uElev);
  float star = step(0.982, sh) * starCore * tw * nightF * smoothstep(0.25, 0.55, st.y);
  col += vec3(0.9, 0.93, 1.0) * star * 0.85;

  /* thin cirrus veil catching the light */
  vec2 q = vec2(p.x * 1.1 + (1.0 - st.y) * 1.6 + uTime * 0.008 + uSeed, st.y * 6.5);
  float r = fbm(q);
  r = 1.0 - abs(2.0 * r - 1.0);
  float fil = pow(max(r - 0.26, 0.0) / 0.74, 2.6);
  float band = smoothstep(0.3, 0.55, st.y) * smoothstep(1.04, 0.72, st.y);
  float cov = smoothstep(0.28, 0.58, fbm3(vec2(q.x * 0.22, uSeed * 3.0)));
  float veil = fil * band * cov;
  float pinkF = smoothstep(12.0, -1.0, uElev) * 0.7;
  vec3 ice = mix(vec3(0.97, 0.97, 0.96), sc * 1.25, pinkF); /* lit rose, not rust */
  float glow = smoothstep(-9.0, -3.5, uElev);
  float depth = 0.5 + 0.5 * smoothstep(-6.5, 3.0, uElev);   /* fainter in deep twilight */
  col = mix(col, ice, clamp(veil, 0.0, 1.0) * 0.7 * glow * depth);

  /* far cumulus row near the horizon, half asleep */
  float hx = p.x * 2.2 + uTime * 0.004 + uSeed * 7.0;
  float covc = smoothstep(0.42, 0.68, vnoise(vec2(hx * 0.8, 4.7)));
  float top = 0.10 + 0.055 * covc * (0.5 + 0.5 * fbm3(vec2(hx * 2.0, 9.1)));
  float body = smoothstep(0.055, 0.085, st.y) * smoothstep(top + 0.012, top - 0.05, st.y) * covc;
  float alpha = smoothstep(0.06, 0.4, body);
  vec3 far = mix(mid, hor, 0.65);
  col = mix(col, far, alpha * 0.8);

  /* horizon haze */
  col = mix(col, hor, smoothstep(0.16, 0.0, st.y) * 0.5);
  gl_FragColor = vec4(dither(col, gl_FragCoord.xy), 1.0);
}
`,

  /* Plate I — the honest grey lid */
  stratus: PRELUDE + `
void main() {
  vec2 st = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(st.x * aspect, st.y);
  float t = uTime * 0.006;
  vec3 zen, mid, hor; skyCols(zen, mid, hor);

  float m  = fbm(p * 2.3 + vec2(t * 3.0, 0.0) + uSeed);
  float m2 = fbm3(p * 5.4 + vec2(-t * 5.0, t) + uSeed * 2.0);

  vec3 deckLit   = mix(mid, vec3(0.90, 0.90, 0.90), 0.5);
  vec3 deckShade = mix(zen, vec3(0.46, 0.47, 0.49), 0.6);
  float lum = 0.42 + 0.22 * m + 0.08 * m2 + 0.08 * (1.0 - st.y);
  vec3 deck = mix(deckShade, deckLit, clamp(lum, 0.0, 1.0));
  /* stratus is grey and owns it */
  deck = mix(deck, vec3(dot(deck, vec3(0.299, 0.587, 0.114))), 0.5) * vec3(0.985, 0.99, 1.01);

  /* the sun as a pale ghost burning through */
  vec2 dv = vec2((st.x - uSun.x) * aspect, st.y - uSun.y * 0.85);
  float ghost = exp(-dot(dv, dv) * 26.0) * smoothstep(-3.0, 8.0, uElev);
  deck += sunColor() * ghost * 0.20;

  /* scud — ragged darker fragments sliding under the deck */
  float scud = smoothstep(0.55, 0.8, fbm(p * vec2(2.6, 5.4) + vec2(t * 16.0, 0.0) + 41.7))
             * smoothstep(0.55, 0.12, st.y);
  deck = mix(deck, deckShade * 0.82, scud * 0.45);

  /* damp haze toward the ground */
  vec3 col = mix(deck, mix(hor, deck, 0.5), smoothstep(0.22, 0.0, st.y) * 0.55);
  gl_FragColor = vec4(dither(col, gl_FragCoord.xy), 1.0);
}
`,

  /* Plate II — fair-weather heaps on the fifteen-minute plan.
     Each puff is an explicit instance with its own lifecycle:
     it condenses, drifts, frays, and is reissued. */
  cumulus: PRELUDE + `
vec3 puffBlob(vec3 bg, vec2 st, float aspect, vec2 c, vec2 r, float ts, float weight) {
  vec2 p = vec2(st.x * aspect, st.y);
  vec2 q = (p - c) / r;
  float d = dot(q, q);
  if (d > 3.4) return bg;
  /* cauliflower boundary: coarse lobes plus a fine crinkle */
  d += (fbm(p * 3.1 + ts) - 0.5) * 1.05 + (fbm3(p * 10.5 + ts * 1.7) - 0.5) * 0.7;
  float a = smoothstep(1.0, 0.80, d) * weight;
  /* flat base — the condensation level */
  float baseY = c.y - r.y * 0.42;
  a *= smoothstep(baseY - 0.012, baseY + 0.035, st.y);
  if (a < 0.004) return bg;
  vec3 zen, mid, hor; skyCols(zen, mid, hor);
  vec3 sc = sunColor();
  float hgt = clamp((st.y - baseY) / (r.y * 1.5), 0.0, 1.0);
  float tex = fbm(p * 7.5 + ts * 1.3);
  vec3 lit = mix(vec3(0.995, 0.99, 0.98), sc, 0.35);
  vec3 shade = mix(mid, vec3(0.58, 0.62, 0.70), 0.5);
  vec3 cc = mix(shade, lit, clamp(pow(hgt, 0.7) * (0.30 + 1.05 * tex), 0.0, 1.0));
  /* the underside stays in its own shadow */
  cc = mix(cc, shade * 0.92, smoothstep(0.42, 0.0, hgt) * 0.5);
  float rim = smoothstep(0.45, 1.0, d);             /* bright fraying edge */
  cc = mix(cc, mix(vec3(1.0), sc, 0.3), rim * 0.5 * hgt);
  return mix(bg, cc, clamp(a, 0.0, 1.0));
}
void main() {
  vec2 st = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec3 col = baseSky(st, aspect);
  vec3 zen, mid, hor; skyCols(zen, mid, hor);
  float span = aspect + 0.9;

  /* far row: three small heaps in the haze */
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float rn = hash21(vec2(fi * 3.7 + 11.0, uSeed));
    float cx = fract(rn + fi * 0.31 + uTime * 0.0035) * span - 0.45;
    vec2 r = vec2(0.085 + 0.05 * rn, 0.038 + 0.02 * rn);
    col = puffBlob(col, st, aspect, vec2(cx, 0.46 + r.y * 0.42), r, fi * 7.7 + uSeed, 0.55);
  }
  /* the main street: four heaps, bases on one level, each on the 15-minute plan */
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float rn = hash21(vec2(fi * 5.3 + 2.0, uSeed * 1.7));
    float life = fract(rn * 3.1 + uTime * (0.010 + 0.004 * rn));
    float lifeA = smoothstep(0.0, 0.22, life) * smoothstep(1.0, 0.72, life);
    float cx = fract(rn * 7.3 + fi * 0.26 + uTime * (0.006 + 0.003 * rn)) * span - 0.45;
    vec2 r = vec2(0.17 + 0.11 * rn, 0.075 + 0.05 * rn);
    r *= 0.65 + 0.45 * lifeA;                       /* young puffs grow, old ones shrink */
    col = puffBlob(col, st, aspect, vec2(cx, 0.30 + r.y * 0.42), r,
                   fi * 13.1 + uSeed + life * 0.6, lifeA);
  }
  /* ground haze */
  col = mix(col, hor, smoothstep(0.14, 0.0, st.y) * 0.5);
  gl_FragColor = vec4(dither(col, gl_FragCoord.xy), 1.0);
}
`,

  /* Plate III — the tower, drawing its own roof */
  cumulonimbus: PRELUDE + `
float hwAt(float y) {
  float base = 0.40 - 0.16 * smoothstep(0.02, 0.55, y);
  float anv  = 0.62 * smoothstep(0.54, 0.80, y);
  return base + anv + 0.001;
}
float cbDens(vec2 p, float aspect) {
  float y = p.y;
  float anvf = smoothstep(0.55, 0.82, y);
  /* the anvil is combed downwind */
  float cx = 0.46 * aspect + 0.16 * smoothstep(0.45, 0.95, y)
           + (fbm3(vec2(y * 3.0 + uSeed, uTime * 0.012)) - 0.5) * 0.15;
  float hw = hwAt(y);
  float dx = p.x - cx;
  float hwR = hw * (1.0 + 0.85 * anvf);
  float hwL = hw * (1.0 - 0.28 * anvf);
  float xd = (dx > 0.0 ? dx / hwR : -dx / hwL) * hw;
  /* cauliflower on the tower, fibre on the anvil */
  float rough = fbm(p * 6.0 + vec2(uTime * 0.02, -uTime * 0.035) + uSeed) - 0.5;
  xd += rough * (0.22 * (1.0 - anvf) + 0.09);
  float env = smoothstep(hw, hw * 0.25, xd);
  float texTower = fbm(p * 4.4 + vec2(uTime * 0.012, -uTime * 0.03) + uSeed * 3.0);
  float texAnv   = fbm(vec2(p.x * 1.9 + uTime * 0.02, p.y * 10.0) + uSeed);
  float tex = mix(texTower, texAnv, anvf);
  float d = env * (0.28 + 0.95 * tex);
  /* the tropopause: the anvil top thins flat against the ceiling */
  d *= 1.0 - smoothstep(0.80, 0.925, y + rough * 0.10);
  return d * smoothstep(0.02, 0.10, y);
}
void main() {
  vec2 st = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(st.x * aspect, st.y);
  vec3 col = baseSky(st, aspect);
  vec3 zen, mid, hor; skyCols(zen, mid, hor);
  vec3 sc = sunColor();

  float d0 = cbDens(p, aspect);
  float alpha = smoothstep(0.13, 0.5, d0);

  /* directional lighting: a second sample toward the sun */
  vec2 sdir = normalize(vec2((uSun.x - 0.5) * aspect, max(uSun.y, 0.15) - 0.45));
  float d1 = cbDens(p + sdir * 0.06, aspect);
  float L = clamp((d0 - d1) * 2.4 + 0.30, 0.0, 1.0);

  float vert = smoothstep(0.02, 0.9, st.y);
  float day = smoothstep(-2.0, 20.0, uElev);
  vec3 lit = mix(vec3(0.985, 0.97, 0.945), sc, 0.4);
  vec3 dk  = mix(vec3(0.15, 0.16, 0.20), vec3(0.33, 0.35, 0.41), day);
  vec3 cc = mix(dk, lit, clamp(L * 0.8 + vert * 0.38, 0.0, 1.0));

  /* interior lightning */
  vec2 fp = vec2(uFlashPos.x * aspect, uFlashPos.y);
  float fl = uFlash * exp(-distance(p, fp) * 4.2);
  cc += vec3(0.72, 0.78, 1.0) * fl * (0.5 + d0 * 1.7);
  col += vec3(0.35, 0.40, 0.60) * uFlash * 0.07;

  /* rain shaft under the base, leaning with the storm */
  float shaft = smoothstep(0.30, 0.03, st.y)
              * smoothstep(0.30, 0.05, abs(p.x - 0.44 * aspect + (0.2 - st.y) * 0.18));
  float rn = vnoise(vec2(p.x * 60.0 + st.y * 14.0, p.y * 6.0 - uTime * 1.3));
  col = mix(col, mix(dk, mid, 0.35), shaft * (0.30 + 0.25 * rn) * day);

  col = mix(col, cc, alpha);
  col = mix(col, hor, smoothstep(0.05, 0.0, st.y) * 0.3);
  gl_FragColor = vec4(dither(col, gl_FragCoord.xy), 1.0);
}
`,

  /* Plate IV — the standing wave */
  lenticularis: PRELUDE + `
void main() {
  vec2 st = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(st.x * aspect, st.y);
  vec3 col = baseSky(st, aspect);
  vec3 zen, mid, hor; skyCols(zen, mid, hor);
  vec3 sc = sunColor();

  /* wind streaking — the air made faintly visible */
  float ws = fbm(vec2(p.x * 1.9 - uTime * 0.05, p.y * 9.0 + uSeed));
  col = mix(col, mix(col, vec3(1.0), 0.3),
            smoothstep(0.55, 0.85, ws) * 0.13 * smoothstep(0.25, 0.7, st.y));

  /* the stack of plates — broadest lens at the bottom, as issued */
  float lowSun = smoothstep(32.0, 6.0, abs(uElev));
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 c = vec2((0.46 + fi * 0.016) * aspect, 0.335 + fi * 0.105);
    vec2 r = vec2(0.35 - fi * 0.062, 0.058 - fi * 0.008);
    vec2 q = (p - c) / r;
    q += (vec2(fbm3(p * 2.2 + fi * 7.0), fbm3(p * 2.2 + fi * 13.0)) - 0.5) * 0.035;
    float d = dot(q, q);
    float a = smoothstep(1.0, 0.90, d);              /* machined edge */
    if (a < 0.004) continue;
    /* smooth lens shading: lit crown, shaded belly */
    float litv = clamp(0.62 + q.y * 0.44 - d * 0.20, 0.0, 1.0);
    vec3 lit = mix(vec3(0.985, 0.975, 0.96), sc, 0.5);
    vec3 shade = mix(mid, vec3(0.44, 0.47, 0.57), 0.6);
    vec3 cc = mix(shade, lit, litv);
    /* low sun slips under the stack and lights the bellies */
    float under = smoothstep(0.15, -0.9, q.y) * smoothstep(1.0, 0.35, d);
    cc = mix(cc, mix(shade, sc, 0.75), under * lowSun * 0.5);
    /* iridescent fringe when the sun rides low */
    float fr = smoothstep(1.0, 0.90, d) * smoothstep(0.66, 0.88, d);
    vec3 iri = 0.5 + 0.5 * cos(6.2831 * (d * 1.4 + vec3(0.0, 0.33, 0.66)));
    cc += iri * fr * lowSun * 0.18;
    col = mix(col, cc, a * 0.96);
  }

  /* two ridges build the wave: a far one in haze, a near one in shadow */
  float farH = 0.165 + 0.09 * fbm3(vec2(p.x * 1.6 + uSeed * 4.0, 8.8));
  float farRidge = smoothstep(farH + 0.005, farH - 0.004, st.y);
  vec3 farCol = mix(mix(zen, hor, 0.55), vec3(0.32, 0.35, 0.44), 0.5);
  col = mix(col, farCol, farRidge * 0.8);
  float nearH = 0.105 + 0.055 * fbm3(vec2(p.x * 2.3 + uSeed * 9.0, 4.2));
  float nearRidge = smoothstep(nearH + 0.004, nearH - 0.003, st.y);
  /* moor texture: bracken and scree, crest catching the last skylight */
  float rt = fbm3(vec2(p.x * 5.0 + uSeed, st.y * 16.0));
  vec3 nearCol = mix(zen * 0.4, vec3(0.08, 0.095, 0.125), 0.55) + hor * 0.06;
  nearCol *= 0.72 + 0.30 * rt + 0.45 * smoothstep(0.0, nearH, st.y);
  col = mix(col, nearCol, nearRidge * 0.97);
  gl_FragColor = vec4(dither(col, gl_FragCoord.xy), 1.0);
}
`,

  /* Plate V — mares' tails, the last cloud to say goodnight */
  cirrus: PRELUDE + `
float streaks(vec2 p, vec2 st, float shear, float scaleY, float speed, float seed, float curve) {
  vec2 q = vec2(p.x * 1.15 + (1.0 - st.y) * shear
                + curve * pow(1.0 - st.y, 2.0) + uTime * speed + seed,
                st.y * scaleY);
  float r = fbm(q);
  r = 1.0 - abs(2.0 * r - 1.0);
  float fil = pow(max(r - 0.30, 0.0) / 0.70, 4.0);
  float band = smoothstep(0.24, 0.5, st.y) * smoothstep(1.04, 0.8, st.y);
  float cov = smoothstep(0.30, 0.58, fbm3(vec2(q.x * 0.24, seed * 2.3)));
  return fil * band * cov;
}
void main() {
  vec2 st = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(st.x * aspect, st.y);
  vec3 col = baseSky(st, aspect);
  vec3 sc = sunColor();
  vec3 zen, mid, hor; skyCols(zen, mid, hor);

  /* a young moon climbs as the sun leaves */
  float moonUp = smoothstep(2.0, -3.5, uElev);
  vec2 mp = vec2(0.80 * aspect, 0.74);
  float md = distance(p, mp);
  float disc = smoothstep(0.040, 0.036, md);
  float shad = smoothstep(0.042, 0.038, distance(p + vec2(0.015, 0.005), mp));
  float crescent = clamp(disc - shad * 0.94, 0.0, 1.0);
  col += vec3(0.92, 0.91, 0.85) * exp(-md * 16.0) * 0.05 * moonUp;
  col = mix(col, vec3(0.97, 0.96, 0.90), crescent * moonUp);

  float s1 = streaks(p, st, 1.7, 7.5, 0.012, uSeed, 0.0);
  float s2 = streaks(p, st, 2.6, 12.0, 0.02, uSeed * 3.1, 1.6);
  float s3 = streaks(p, st, 1.1, 16.0, 0.03, uSeed * 5.7, 2.8) * 0.6;

  /* cirrus stays lit well after ground dusk */
  float litUp = smoothstep(-9.5, -4.0, uElev);
  float pinkF = smoothstep(14.0, -2.0, uElev) * 0.9;
  vec3 ice = mix(vec3(0.985, 0.985, 0.975), sc, pinkF);
  vec3 ember = mix(ice, sc * 1.05, 0.5); /* hooks catch more colour */

  col = mix(col, ice,   clamp(s1, 0.0, 1.0) * 0.72 * litUp);
  col = mix(col, ember, clamp(s2, 0.0, 1.0) * 0.55 * litUp);
  col = mix(col, ice,   clamp(s3, 0.0, 1.0) * 0.38 * litUp);

  col = mix(col, hor, smoothstep(0.14, 0.0, st.y) * 0.4);
  gl_FragColor = vec4(dither(col, gl_FragCoord.xy), 1.0);
}
`
};

/* ---------- renderer ---------- */

class SkyPlate {
  constructor(el) {
    this.el = el;
    this.genus = el.dataset.genus;
    this.seed = parseFloat(el.dataset.seed || '1');
    this.canvas = el.querySelector('canvas');
    this.visible = false;
    this.needsResize = true;

    const gl = this.canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: 'low-power', preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error('no webgl');
    this.gl = gl;
    this.dead = false;
    /* a lost context must degrade to the designed static skies, never a black plate */
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.dead = true;
      document.documentElement.classList.add('no-gl');
    });

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error('shader: ' + gl.getShaderInfoLog(s));
      }
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, SHADERS[this.genus]));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('link: ' + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);
    this.prog = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.u = {};
    for (const name of ['uRes', 'uTime', 'uSun', 'uElev', 'uFlash', 'uFlashPos', 'uSeed']) {
      this.u[name] = gl.getUniformLocation(prog, name);
    }
    gl.uniform1f(this.u.uSeed, this.seed);

    /* lightning bookkeeping (cumulonimbus only) */
    this.nextFlash = 2.5 + Math.random() * 4;
    this.flashSeq = null;
    this.flashVal = 0;
    this.flashPos = [0.5, 0.45];
    this.captionEl = this.genus === 'cumulonimbus'
      ? el.closest('figure')?.querySelector('.fig-caption') : null;
    this.captionLit = false;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const maxW = window.innerWidth < 720 ? 900 : 1500;
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    const scale = Math.min(1, maxW / (w * dpr));
    const bw = Math.max(2, Math.round(w * dpr * scale));
    const bh = Math.max(2, Math.round(h * dpr * scale));
    if (bw !== this.canvas.width || bh !== this.canvas.height) {
      this.canvas.width = bw;
      this.canvas.height = bh;
      this.gl.viewport(0, 0, bw, bh);
    }
    this.needsResize = false;
  }

  updateFlash(t) {
    if (this.genus !== 'cumulonimbus') return;
    if (!this.flashSeq && t >= this.nextFlash) {
      /* a strike: 2–3 pulses, then a long rest */
      const n = 2 + (Math.random() < 0.4 ? 1 : 0);
      this.flashSeq = [];
      let at = t;
      for (let i = 0; i < n; i++) {
        this.flashSeq.push({ t: at, amp: 0.55 + Math.random() * 0.45 });
        at += 0.09 + Math.random() * 0.16;
      }
      this.flashPos = [0.38 + Math.random() * 0.28, 0.3 + Math.random() * 0.35];
      this.nextFlash = t + 4 + Math.random() * 7;
    }
    let v = 0;
    if (this.flashSeq) {
      let alive = false;
      for (const pl of this.flashSeq) {
        const dt = t - pl.t;
        if (dt < -0.01) { alive = true; continue; }
        if (dt < 1.2) {
          alive = true;
          v += pl.amp * Math.exp(-dt * 11) * (dt < 0.015 ? dt / 0.015 : 1);
        }
      }
      if (!alive) this.flashSeq = null;
    }
    v = Math.min(v, 1);
    if (Math.abs(v - this.flashVal) > 0.004 || (v === 0 && this.flashVal !== 0)) {
      this.flashVal = v;
      /* leak the flash onto the page */
      this.el.closest('.plate--cb')?.style.setProperty('--flash', v.toFixed(3));
    }
    /* the caption catches the light: WAIT FOR IT. */
    if (this.captionEl) {
      const lit = v > 0.28 ? true : v < 0.08 ? false : this.captionLit;
      if (lit !== this.captionLit) {
        this.captionLit = lit;
        this.captionEl.classList.toggle('flash-lit', lit);
      }
    }
  }

  draw(t, sun) {
    if (this.dead) return;
    if (this.needsResize) this.resize();
    if (!this.canvas.width) return;
    this.updateFlash(t);
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.uniform2f(this.u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u.uTime, t);
    gl.uniform2f(this.u.uSun, sun.x, sun.y);
    gl.uniform1f(this.u.uElev, sun.elev);
    gl.uniform1f(this.u.uFlash, this.flashVal);
    gl.uniform2f(this.u.uFlashPos, this.flashPos[0], this.flashPos[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

export function initSkies() {
  const plates = [];
  let failed = false;

  document.querySelectorAll('.sky[data-genus]').forEach((el) => {
    try {
      plates.push(new SkyPlate(el));
    } catch (e) {
      failed = true;
    }
  });

  if (failed || plates.length === 0) {
    document.documentElement.classList.add('no-gl');
    return null;
  }

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      const plate = plates.find((p) => p.el === en.target);
      if (plate) plate.visible = en.isIntersecting;
    }
  }, { rootMargin: '80px 0px' });
  plates.forEach((p) => io.observe(p.el));

  const onResize = () => plates.forEach((p) => { p.needsResize = true; });
  window.addEventListener('resize', onResize);

  return {
    plates,
    draw(t, sun) {
      for (const p of plates) if (p.visible) p.draw(t, sun);
    },
    drawAll(t, sun) {
      for (const p of plates) p.draw(t, sun);
    },
  };
}
