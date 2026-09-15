/* KESSLER WATCH — the inhabited sky.
   Earth + live orbital population. Positions are evaluated in the vertex
   shader from circular Keplerian elements; a CPU mirror runs for picking
   and conjunction geometry. */

import * as THREE from 'three';
import {
  CITIES, buildCatalog, mulberry32, EARTH_OMEGA, KM_PER_UNIT,
  NAV_SCENE_R, GEO_SCENE_R,
} from './data.js';

const DEG = Math.PI / 180;

const COLORS = {
  void: 0x05080f,
  amber: new THREE.Color('#FFB454'),
  amberDim: new THREE.Color('#C98F4F'),
  green: new THREE.Color('#4FE3A3'),
  greenDim: new THREE.Color('#2E8A67'),
  red: new THREE.Color('#FF4B45'),
};

/* orbital-plane basis from inclination + RAAN (Y-up, equator = XZ plane) */
const _x = new THREE.Vector3(1, 0, 0);
const _z = new THREE.Vector3(0, 0, 1);
const _y = new THREE.Vector3(0, 1, 0);
function planeBasis(inclDeg, raanDeg) {
  const A = _x.clone();
  const B = _z.clone().applyAxisAngle(_x, inclDeg * DEG);
  A.applyAxisAngle(_y, raanDeg * DEG);
  B.applyAxisAngle(_y, raanDeg * DEG);
  return [A, B];
}

function latLonToVec3(lat, lon, r) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

/* ------------------------------------------------------------------ */

export function createSky(canvas, callbacks) {
  const state = {
    simT: 0,
    rate: 60,
    running: true,
    heroVisible: true,
    tabVisible: true,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    pointer: { x: -1e4, y: -1e4, active: false },
    parallax: { x: 0, y: 0, tx: 0, ty: 0 },
    hovered: -1,
    slew: null,
    disposed: false,
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  if (!renderer.getContext()) return null;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(COLORS.void, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);

  const { objects, conjPairs } = buildCatalog();
  const N = objects.length;

  /* ---------- starfield (sparse, dim, far) ---------- */
  {
    const rnd = mulberry32(77);
    const count = 520;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const al = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize().multiplyScalar(60);
      pos.set([v.x, v.y, v.z], i * 3);
      sz[i] = 0.7 + rnd() * 1.3;
      al[i] = 0.12 + rnd() * 0.3;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uPR: { value: DPR } },
      vertexShader: `
        attribute float aSize; attribute float aAlpha; varying float vA;
        uniform float uPR;
        void main(){ vA = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPR; }`,
      fragmentShader: `
        varying float vA;
        void main(){ vec2 c = gl_PointCoord - .5; if(dot(c,c) > .25) discard;
          gl_FragColor = vec4(vec3(.62,.70,.80), vA); }`,
    });
    scene.add(new THREE.Points(g, m));
  }

  /* ---------- Earth group ---------- */
  const earth = new THREE.Group();
  scene.add(earth);

  {
    const geo = new THREE.SphereGeometry(1, 72, 48);
    const mat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        varying vec3 vN; varying vec3 vV;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        varying vec3 vN; varying vec3 vV;
        void main(){
          float fr = pow(1.0 - abs(dot(vN, vV)), 1.6);
          vec3 deep = vec3(0.017, 0.032, 0.060);
          vec3 rim  = vec3(0.090, 0.180, 0.310);
          vec3 col = mix(deep, rim, fr);
          gl_FragColor = vec4(col, 1.0); }`,
    });
    earth.add(new THREE.Mesh(geo, mat));
  }

  /* atmosphere rim */
  {
    const geo = new THREE.SphereGeometry(1.052, 72, 48);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vN; varying vec3 vV;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        varying vec3 vN; varying vec3 vV;
        void main(){
          float fr = pow(1.0 - abs(dot(vN, vV)), 2.6);
          gl_FragColor = vec4(vec3(0.16, 0.38, 0.72) * fr, fr * 0.9); }`,
    });
    scene.add(new THREE.Mesh(geo, mat));
  }

  /* graticule — faint instrument lines, earth-fixed */
  {
    const pts = [];
    const R = 1.004;
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lon = 0; lon < 360; lon += 4) {
        pts.push(latLonToVec3(lat, lon, R), latLonToVec3(lat, lon + 4, R));
      }
    }
    for (let lon = 0; lon < 360; lon += 30) {
      for (let lat = -88; lat < 88; lat += 4) {
        pts.push(latLonToVec3(lat, lon, R), latLonToVec3(lat + 4, lon, R));
      }
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({
      color: 0x28486e, transparent: true, opacity: 0.11,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    earth.add(new THREE.LineSegments(g, m));
  }

  /* city lights */
  {
    const rnd = mulberry32(4021);
    const pts = [];
    const cols = [];
    const szs = [];
    const phs = [];
    const cWarm = new THREE.Color('#FFD9A0');
    const cCool = new THREE.Color('#B8C8E8');
    for (const [lat, lon, w] of CITIES) {
      const count = Math.round(7 + w * 24);
      const sigma = 0.45 + w * 1.15;
      for (let i = 0; i < count; i++) {
        const g1 = (rnd() + rnd() + rnd() - 1.5) * sigma;
        const g2 = (rnd() + rnd() + rnd() - 1.5) * sigma;
        const v = latLonToVec3(lat + g1, lon + g2 / Math.max(0.2, Math.cos(lat * DEG)), 1.006);
        pts.push(v.x, v.y, v.z);
        const c = cWarm.clone().lerp(cCool, rnd() * 0.45);
        const b = 0.35 + rnd() * 0.65 * (0.5 + w * 0.5);
        cols.push(c.r * b, c.g * b, c.b * b);
        szs.push(0.9 + rnd() * 1.6 * (0.6 + w * 0.6));
        phs.push(rnd() * 6.283);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(cols), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(szs), 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(phs), 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uPR: { value: DPR }, uT: { value: 0 }, uScale: { value: 1 } },
      vertexShader: `
        attribute vec3 aColor; attribute float aSize; attribute float aPhase;
        uniform float uPR; uniform float uT; uniform float uScale;
        varying vec3 vC; varying float vTw;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPR * uScale * (3.9 / -mv.z);
          vC = aColor;
          vTw = 0.82 + 0.18 * sin(uT * 0.9 + aPhase); }`,
      fragmentShader: `
        varying vec3 vC; varying float vTw;
        void main(){
          vec2 c = gl_PointCoord - .5; float d = length(c);
          if(d > .5) discard;
          float a = smoothstep(.5, .08, d);
          gl_FragColor = vec4(vC * vTw, a * .95); }`,
    });
    earth.add(new THREE.Points(g, m));
    state.cityMat = m;
  }

  /* ---------- orbital population: shared attribute builders ---------- */
  const basisA = new Float32Array(N * 3);
  const basisB = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const [A, B] = planeBasis(objects[i].incl, objects[i].raan);
    basisA.set([A.x, A.y, A.z], i * 3);
    basisB.set([B.x, B.y, B.z], i * 3);
    objects[i]._A = A; objects[i]._B = B;
  }

  /* Phase pair 0 for a guaranteed sub-200 m event shortly after load.
     MUST run before attribute arrays are filled so GPU and CPU agree. */
  (function primeFirstEvent() {
    const [ia, ib] = conjPairs[0];
    const oa = objects[ia], ob = objects[ib];
    const nA = new THREE.Vector3().crossVectors(oa._A, oa._B);
    const nB = new THREE.Vector3().crossVectors(ob._A, ob._B);
    const P = new THREE.Vector3().crossVectors(nA, nB).normalize();
    const thA = Math.atan2(P.dot(oa._B), P.dot(oa._A));
    const thB = Math.atan2(P.dot(ob._B), P.dot(ob._A));
    const T1 = 4320; // sim seconds → 72 s of wall time at the default 60×
    oa.theta0 = thA - oa.n * T1;
    ob.theta0 = thB - ob.n * T1 + (0.14 / (ob.rScaled * KM_PER_UNIT)); // ~140 m along-track offset
  })();

  function colorFor(o) {
    if (o.shell === 'NAV') return COLORS.green;
    if (o.shell === 'GEO') return o.type === 'PAY' ? COLORS.greenDim : COLORS.amberDim;
    if (o.type === 'PAY') return COLORS.green;
    if (o.type === 'R/B') return COLORS.amberDim;
    return COLORS.amber;
  }
  function sizeFor(o) {
    if (o.shell === 'NAV') return 3.3;
    if (o.shell === 'GEO') return 2.2;
    if (o.type === 'PAY') return 2.7;
    if (o.type === 'R/B') return 2.4;
    return 1.9;
  }

  const orbitUniforms = {
    uTime: { value: 0 },
    uPR: { value: DPR },
    uScale: { value: 1 },
    uFade: { value: 0 },
  };

  /* points */
  {
    const pr = new Float32Array(N);
    const pt0 = new Float32Array(N);
    const pn = new Float32Array(N);
    const pc = new Float32Array(N * 3);
    const ps = new Float32Array(N);
    const dummy = new Float32Array(N * 3);
    const rnd = mulberry32(9);
    for (let i = 0; i < N; i++) {
      const o = objects[i];
      pr[i] = o.rScaled; pt0[i] = o.theta0; pn[i] = o.n;
      const c = colorFor(o);
      pc.set([c.r, c.g, c.b], i * 3);
      ps[i] = sizeFor(o) * (0.85 + rnd() * 0.3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(dummy, 3));
    g.setAttribute('aA', new THREE.BufferAttribute(basisA, 3));
    g.setAttribute('aB', new THREE.BufferAttribute(basisB, 3));
    g.setAttribute('aR', new THREE.BufferAttribute(pr, 1));
    g.setAttribute('aT0', new THREE.BufferAttribute(pt0, 1));
    g.setAttribute('aN', new THREE.BufferAttribute(pn, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(pc, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(ps, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), GEO_SCENE_R + 1);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: orbitUniforms,
      vertexShader: `
        attribute vec3 aA; attribute vec3 aB;
        attribute float aR; attribute float aT0; attribute float aN;
        attribute vec3 aColor; attribute float aSize;
        uniform float uTime; uniform float uPR; uniform float uScale;
        varying vec3 vC;
        void main(){
          float th = aT0 + aN * uTime;
          vec3 p = aR * (aA * cos(th) + aB * sin(th));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPR * uScale * (7.5 / -mv.z);
          vC = aColor; }`,
      fragmentShader: `
        varying vec3 vC; uniform float uFade;
        void main(){
          vec2 c = gl_PointCoord - .5; float d = length(c);
          if(d > .5) discard;
          float core = smoothstep(.5, .12, d);
          float halo = smoothstep(.5, .0, d) * .35;
          gl_FragColor = vec4(vC, (core + halo) * uFade); }`,
    });
    scene.add(new THREE.Points(g, m));
  }

  /* trails — arcs behind true anomaly, evaluated in-shader */
  {
    const segsFor = (o) => (o.shell === 'NAV' ? 22 : o.shell === 'GEO' ? 10 : 16);
    const arcFor = (o) => (o.shell === 'NAV' ? 0.5 : o.shell === 'GEO' ? 0.22 : 0.34);
    let vtx = 0;
    for (const o of objects) vtx += segsFor(o) * 2;
    const tA = new Float32Array(vtx * 3);
    const tB = new Float32Array(vtx * 3);
    const tr = new Float32Array(vtx);
    const tt0 = new Float32Array(vtx);
    const tn = new Float32Array(vtx);
    const tc = new Float32Array(vtx * 3);
    const tseg = new Float32Array(vtx);   // 0..1 along trail
    const tarc = new Float32Array(vtx);
    const talpha = new Float32Array(vtx);
    const dummy = new Float32Array(vtx * 3);
    let vi = 0;
    for (let i = 0; i < N; i++) {
      const o = objects[i];
      const S = segsFor(o);
      const arc = arcFor(o);
      const c = colorFor(o);
      const baseAlpha = o.shell === 'GEO' ? 0.13 : o.shell === 'NAV' ? 0.30 : 0.22;
      for (let s = 0; s < S; s++) {
        for (const f of [s / S, (s + 1) / S]) {
          tA.set([basisA[i * 3], basisA[i * 3 + 1], basisA[i * 3 + 2]], vi * 3);
          tB.set([basisB[i * 3], basisB[i * 3 + 1], basisB[i * 3 + 2]], vi * 3);
          tr[vi] = o.rScaled; tt0[vi] = o.theta0; tn[vi] = o.n;
          tc.set([c.r, c.g, c.b], vi * 3);
          tseg[vi] = f; tarc[vi] = arc; talpha[vi] = baseAlpha;
          vi++;
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(dummy, 3));
    g.setAttribute('aA', new THREE.BufferAttribute(tA, 3));
    g.setAttribute('aB', new THREE.BufferAttribute(tB, 3));
    g.setAttribute('aR', new THREE.BufferAttribute(tr, 1));
    g.setAttribute('aT0', new THREE.BufferAttribute(tt0, 1));
    g.setAttribute('aN', new THREE.BufferAttribute(tn, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(tc, 3));
    g.setAttribute('aSeg', new THREE.BufferAttribute(tseg, 1));
    g.setAttribute('aArc', new THREE.BufferAttribute(tarc, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(talpha, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), GEO_SCENE_R + 1);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: orbitUniforms,
      vertexShader: `
        attribute vec3 aA; attribute vec3 aB;
        attribute float aR; attribute float aT0; attribute float aN;
        attribute vec3 aColor; attribute float aSeg; attribute float aArc; attribute float aAlpha;
        uniform float uTime;
        varying vec3 vC; varying float vA;
        void main(){
          float th = aT0 + aN * uTime - aSeg * aArc;
          vec3 p = aR * (aA * cos(th) + aB * sin(th));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          vC = aColor;
          vA = (1.0 - aSeg) * aAlpha; }`,
      fragmentShader: `
        varying vec3 vC; varying float vA; uniform float uFade;
        void main(){ gl_FragColor = vec4(vC, vA * uFade); }`,
    });
    scene.add(new THREE.LineSegments(g, m));
  }

  /* reference rings: 6 NAV planes + GEO belt */
  {
    const pts = [];
    const cols = [];
    const push = (v, c, a) => { pts.push(v.x, v.y, v.z); cols.push(c.r, c.g, c.b, a); };
    const SEG = 180;
    for (let p = 0; p < 6; p++) {
      const [A, B] = planeBasis(55, p * 60 + 4);
      for (let s = 0; s < SEG; s++) {
        const t1 = (s / SEG) * Math.PI * 2;
        const t2 = ((s + 1) / SEG) * Math.PI * 2;
        push(A.clone().multiplyScalar(Math.cos(t1) * NAV_SCENE_R).addScaledVector(B, Math.sin(t1) * NAV_SCENE_R), COLORS.green, 0.075);
        push(A.clone().multiplyScalar(Math.cos(t2) * NAV_SCENE_R).addScaledVector(B, Math.sin(t2) * NAV_SCENE_R), COLORS.green, 0.075);
      }
    }
    {
      const [A, B] = planeBasis(0.2, 0);
      for (let s = 0; s < SEG; s++) {
        const t1 = (s / SEG) * Math.PI * 2;
        const t2 = ((s + 1) / SEG) * Math.PI * 2;
        push(A.clone().multiplyScalar(Math.cos(t1) * GEO_SCENE_R).addScaledVector(B, Math.sin(t1) * GEO_SCENE_R), COLORS.amber, 0.06);
        push(A.clone().multiplyScalar(Math.cos(t2) * GEO_SCENE_R).addScaledVector(B, Math.sin(t2) * GEO_SCENE_R), COLORS.amber, 0.06);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(cols), 4));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uFade: orbitUniforms.uFade },
      vertexShader: `
        attribute vec4 aCol; varying vec4 vC;
        void main(){ vC = aCol;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        varying vec4 vC; uniform float uFade;
        void main(){ gl_FragColor = vec4(vC.rgb, vC.a * uFade); }`,
    });
    scene.add(new THREE.LineSegments(g, m));
  }

  /* ---------- hover + conjunction markers ---------- */
  function ringTexture(colorCss, diamond) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 96;
    const ctx = cv.getContext('2d');
    ctx.strokeStyle = colorCss;
    ctx.lineWidth = 5;
    if (diamond) {
      ctx.translate(48, 48); ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-24, -24, 48, 48);
    } else {
      ctx.beginPath(); ctx.arc(48, 48, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(48, 4); ctx.lineTo(48, 16); ctx.moveTo(48, 80); ctx.lineTo(48, 92);
      ctx.moveTo(4, 48); ctx.lineTo(16, 48); ctx.moveTo(80, 48); ctx.lineTo(92, 48); ctx.stroke();
    }
    const tx = new THREE.CanvasTexture(cv);
    tx.anisotropy = 2;
    return tx;
  }
  const hoverSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: ringTexture('#B9E8FF', false), transparent: true, opacity: 0,
    depthTest: false, depthWrite: false,
  }));
  hoverSprite.renderOrder = 10;
  scene.add(hoverSprite);

  const conjSprites = [0, 1].map(() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: ringTexture('#FF4B45', true), transparent: true, opacity: 0,
      depthTest: false, depthWrite: false,
    }));
    s.renderOrder = 11;
    scene.add(s);
    return s;
  });
  const conjLineGeo = new THREE.BufferGeometry();
  conjLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const conjLine = new THREE.Line(conjLineGeo, new THREE.LineBasicMaterial({
    color: COLORS.red, transparent: true, opacity: 0, depthTest: false,
  }));
  conjLine.renderOrder = 9;
  scene.add(conjLine);

  /* ---------- CPU mirror ---------- */
  const cpuPos = new Float32Array(N * 3);
  const _v = new THREE.Vector3();
  function evalPos(i, t, out) {
    const o = objects[i];
    const th = o.theta0 + o.n * t;
    const ca = Math.cos(th) * o.rScaled;
    const sa = Math.sin(th) * o.rScaled;
    out.set(
      o._A.x * ca + o._B.x * sa,
      o._A.y * ca + o._B.y * sa,
      o._A.z * ca + o._B.z * sa,
    );
    return out;
  }
  function updateCpu(t) {
    for (let i = 0; i < N; i++) {
      evalPos(i, t, _v);
      cpuPos[i * 3] = _v.x; cpuPos[i * 3 + 1] = _v.y; cpuPos[i * 3 + 2] = _v.z;
    }
  }

  /* ---------- conjunction machinery ---------- */
  const conj = {
    phase: 'IDLE', pair: null, tca: 0, predMissKm: 0,
    nextSearchFrom: 0,
  };

  function wrapPi(a) {
    a = a % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  /* Find the next time two same-radius objects are simultaneously near a
     plane-intersection point. Honest mechanics: no teleporting. */
  function findNextConjunction(fromT) {
    let best = null;
    for (const [ia, ib] of conjPairs) {
      const oa = objects[ia], ob = objects[ib];
      const nA = new THREE.Vector3().crossVectors(oa._A, oa._B);
      const nB = new THREE.Vector3().crossVectors(ob._A, ob._B);
      const L = new THREE.Vector3().crossVectors(nA, nB);
      if (L.lengthSq() < 1e-9) continue;
      L.normalize();
      for (const sign of [1, -1]) {
        const P = L.clone().multiplyScalar(sign);
        const thA = Math.atan2(P.dot(oa._B), P.dot(oa._A));
        const thB = Math.atan2(P.dot(ob._B), P.dot(ob._A));
        // times object A passes P
        let m = Math.ceil((fromT * oa.n + oa.theta0 - thA) / (2 * Math.PI));
        for (let k = 0; k < 26; k++) {
          const t = (thA - oa.theta0 + 2 * Math.PI * (m + k)) / oa.n;
          if (t < fromT) continue;
          if (t > fromT + 86400) break;
          const dB = wrapPi(ob.theta0 + ob.n * t - thB);
          const along = Math.abs(dB) * ob.rScaled * KM_PER_UNIT;
          const radial = Math.abs(oa.rScaled - ob.rScaled) * KM_PER_UNIT;
          const miss = Math.sqrt(along * along + radial * radial);
          if (!best || miss < best.miss) {
            best = { tca: t, miss, pair: [ia, ib] };
          }
        }
      }
    }
    return best;
  }

  function armConjunction(fromT) {
    const found = findNextConjunction(fromT);
    if (found) {
      conj.pair = found.pair;
      conj.tca = found.tca;
      conj.predMissKm = Math.max(found.miss, 0.11);
      conj.phase = 'IDLE';
    }
  }

  const _pa = new THREE.Vector3();
  const _pb = new THREE.Vector3();
  function conjTick(t) {
    if (!conj.pair) return;
    const dt = conj.tca - t;
    const [ia, ib] = conj.pair;
    let phase = 'IDLE';
    const close = conj.predMissKm < 5; // red is reserved for genuinely close approaches
    if (dt <= 0 && dt > -240) phase = close ? 'RESOLVED' : 'IDLE';
    else if (dt <= 300 && dt > 0) phase = close ? 'ALERT' : 'WATCH';
    else if (dt <= 1500 && dt > 0) phase = 'WATCH';
    else if (dt <= -240) {
      armConjunction(t + 900);
      phase = 'IDLE';
    }
    _pa.fromArray(cpuPos, ia * 3);
    _pb.fromArray(cpuPos, ib * 3);
    const sepKm = _pa.distanceTo(_pb) * KM_PER_UNIT;

    const showMarks = phase === 'ALERT' || phase === 'RESOLVED';
    const mOp = phase === 'ALERT' ? 0.95 : 0.45;
    conjSprites[0].position.copy(_pa);
    conjSprites[1].position.copy(_pb);
    for (const s of conjSprites) {
      s.material.opacity += ((showMarks ? mOp : 0) - s.material.opacity) * 0.12;
      const d = camera.position.distanceTo(s.position);
      s.scale.setScalar(0.028 * d);
    }
    const lp = conjLineGeo.attributes.position.array;
    lp[0] = _pa.x; lp[1] = _pa.y; lp[2] = _pa.z;
    lp[3] = _pb.x; lp[4] = _pb.y; lp[5] = _pb.z;
    conjLineGeo.attributes.position.needsUpdate = true;
    conjLine.material.opacity += ((phase === 'ALERT' && sepKm < 900 ? 0.55 : 0) - conjLine.material.opacity) * 0.1;

    if (phase !== conj.phase) conj.phase = phase;
    callbacks.onConjunction({
      phase, sepKm, dt,
      predMissKm: conj.predMissKm,
      a: objects[ia], b: objects[ib],
      relVelKmS: relVelocity(ia, ib),
    });
  }

  const _va = new THREE.Vector3();
  const _vb = new THREE.Vector3();
  function relVelocity(ia, ib) {
    const oa = objects[ia], ob = objects[ib];
    const tha = oa.theta0 + oa.n * state.simT;
    const thb = ob.theta0 + ob.n * state.simT;
    _va.copy(oa._A).multiplyScalar(-Math.sin(tha)).addScaledVector(oa._B, Math.cos(tha)).multiplyScalar(oa.rScaled * oa.n);
    _vb.copy(ob._A).multiplyScalar(-Math.sin(thb)).addScaledVector(ob._B, Math.cos(thb)).multiplyScalar(ob.rScaled * ob.n);
    return _va.sub(_vb).length() * KM_PER_UNIT;
  }

  armConjunction(0);
  conj.pair = conjPairs[0];
  conj.tca = 4320;
  conj.predMissKm = 0.14;

  /* ---------- picking ---------- */
  const _proj = new THREE.Vector3();
  function pick() {
    if (!state.pointer.active) {
      if (state.hovered !== -1) { state.hovered = -1; callbacks.onHover(null); }
      hoverSprite.material.opacity += (0 - hoverSprite.material.opacity) * 0.2;
      return;
    }
    const w = canvas.clientWidth, h = canvas.clientHeight;
    let bestI = -1, bestD = 22 * 22;
    for (let i = 0; i < N; i++) {
      _proj.fromArray(cpuPos, i * 3).project(camera);
      if (_proj.z > 1) continue;
      const sx = (_proj.x * 0.5 + 0.5) * w;
      const sy = (-_proj.y * 0.5 + 0.5) * h;
      const dx = sx - state.pointer.x, dy = sy - state.pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) { bestD = d2; bestI = i; }
    }
    if (bestI !== state.hovered) {
      state.hovered = bestI;
      callbacks.onHover(bestI === -1 ? null : objects[bestI], state.pointer.x, state.pointer.y);
    } else if (bestI !== -1) {
      callbacks.onHoverMove(state.pointer.x, state.pointer.y);
    }
    if (bestI !== -1) {
      hoverSprite.position.fromArray(cpuPos, bestI * 3);
      const d = camera.position.distanceTo(hoverSprite.position);
      hoverSprite.scale.setScalar(0.030 * d);
      hoverSprite.material.opacity += (0.9 - hoverSprite.material.opacity) * 0.25;
    } else {
      hoverSprite.material.opacity += (0 - hoverSprite.material.opacity) * 0.2;
    }
  }

  /* ---------- camera ---------- */
  function cameraDistance() {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    if (aspect < 0.7) return 11.6;
    if (aspect < 1.1) return 9.2;
    return 7.6;
  }
  let camAz = -0.55;
  const camEl = 0.34;
  function placeCamera(wallT) {
    const drift = state.reduced ? 0 : Math.sin(wallT * 0.021) * 0.16 + wallT * 0.0055;
    const az = camAz + drift + state.parallax.x * 0.045;
    const el = camEl + state.parallax.y * 0.03;
    const d = cameraDistance();
    camera.position.set(
      d * Math.cos(el) * Math.sin(az),
      d * Math.sin(el),
      d * Math.cos(el) * Math.cos(az),
    );
    camera.lookAt(0, 0.05, 0);
  }

  /* ---------- resize ---------- */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const scale = Math.min(1.25, Math.max(0.7, h / 900));
    orbitUniforms.uScale.value = scale;
    if (state.cityMat) state.cityMat.uniforms.uScale.value = scale;
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- events ---------- */
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    state.pointer.x = e.clientX - r.left;
    state.pointer.y = e.clientY - r.top;
    state.pointer.active = true;
    state.parallax.tx = (state.pointer.x / r.width - 0.5) * 2;
    state.parallax.ty = (state.pointer.y / r.height - 0.5) * 2;
  });
  canvas.addEventListener('pointerleave', () => {
    state.pointer.active = false;
    state.parallax.tx = 0; state.parallax.ty = 0;
  });
  canvas.addEventListener('pointerdown', (e) => {
    // tap-to-inspect on touch
    const r = canvas.getBoundingClientRect();
    state.pointer.x = e.clientX - r.left;
    state.pointer.y = e.clientY - r.top;
    state.pointer.active = true;
  });

  document.addEventListener('visibilitychange', () => {
    state.tabVisible = document.visibilityState === 'visible';
  });
  const io = new IntersectionObserver((entries) => {
    state.heroVisible = entries[0].isIntersecting;
  }, { threshold: 0.02 });
  io.observe(canvas);

  /* ---------- main loop ---------- */
  let last = performance.now();
  let wallT = 0;
  let fadeIn = state.reduced ? 1 : 0;

  if (state.reduced) {
    state.simT = 5100; // composed frame: population spread, alert not yet raised
    state.rate = 0;
  }

  function frame(now) {
    if (state.disposed) return;
    requestAnimationFrame(frame);
    if (!state.tabVisible || !state.heroVisible) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    wallT += dt;

    fadeIn = Math.min(1, fadeIn + dt * 0.7);
    orbitUniforms.uFade.value = fadeIn;

    if (state.slew) {
      /* choreographed slew: a 1.6 s cubic-out rush of orbital time, then settle */
      const s = state.slew;
      s.p = Math.min(1, s.p + dt / 1.6);
      const e = 1 - Math.pow(1 - s.p, 3);
      state.simT = s.from + (s.to - s.from) * e;
      if (s.p >= 1) { state.simT = s.to; state.slew = null; }
    } else {
      state.simT += dt * state.rate;
    }
    orbitUniforms.uTime.value = state.simT;
    if (state.cityMat) state.cityMat.uniforms.uT.value = wallT;

    earth.rotation.y = EARTH_OMEGA * state.simT;

    state.parallax.x += (state.parallax.tx - state.parallax.x) * 0.04;
    state.parallax.y += (state.parallax.ty - state.parallax.y) * 0.04;
    placeCamera(wallT);

    updateCpu(state.simT);
    conjTick(state.simT);
    pick();

    callbacks.onTick(state.simT, state.rate);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  /* ---------- public api ---------- */
  return {
    objects,
    setRate(r) { state.rate = r; },
    getRate() { return state.rate; },
    getSimT() { return state.simT; },
    slewTo(t) {
      if (t <= state.simT) return;
      if (state.reduced) { state.simT = t; return; }
      state.slew = { from: state.simT, to: t, p: 0 };
    },
    isSlewing() { return !!state.slew; },
    isReduced() { return state.reduced; },
    counts() {
      const leo = objects.filter((o) => o.shell === 'LEO').length;
      const nav = objects.filter((o) => o.shell === 'NAV').length;
      const geo = objects.filter((o) => o.shell === 'GEO').length;
      const deb = objects.filter((o) => o.type !== 'PAY').length;
      return { total: objects.length, leo, nav, geo, debrisPct: Math.round((deb / objects.length) * 100) };
    },
  };
}
