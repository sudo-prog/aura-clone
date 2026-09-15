/* ==========================================================================
   TOKEN RUNNER — Quarterworld's one-of-one house cabinet (1984)
   Game logic renders to a 224x288 2D canvas (phosphor persistence via
   translucent clears); a WebGL pass adds barrel distortion, scanlines,
   aperture grille, vignette, chromatic aberration and power-on bloom.
   ========================================================================== */
(() => {
'use strict';

const GW = 224, GH = 288;
const PY = GH - 26;                       // player rail
const canvas = document.getElementById('crt');
const wrap = document.getElementById('crtWrap');
if (!canvas || !wrap) return;

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const gcv = document.createElement('canvas');
gcv.width = GW; gcv.height = GH;
const g = gcv.getContext('2d');

/* ---------------- persistence ---------------- */

const SEED_SCORES = [
  ['MRG', 9850], ['ROY', 8725], ['KAZ', 7300], ['DOT', 6150],
  ['STU', 5025], ['PIP', 3900], ['LIL', 2775], ['ZIP', 1650],
];
function loadScores() {
  try {
    const raw = JSON.parse(localStorage.getItem('qw.scores'));
    if (Array.isArray(raw) && raw.length) return raw.slice(0, 8);
  } catch (e) { /* fresh machine */ }
  return SEED_SCORES.map(([n, s]) => ({ n, s }));
}
function saveScores() { try { localStorage.setItem('qw.scores', JSON.stringify(scores)); } catch (e) {} }
let scores = loadScores();

function loadWallet() {
  const v = parseInt(localStorage.getItem('qw.wallet'), 10);
  return Number.isFinite(v) ? Math.max(0, Math.min(99, v)) : 10;
}
let wallet = loadWallet();
function saveWallet() { try { localStorage.setItem('qw.wallet', String(wallet)); } catch (e) {} }

/* ---------------- DOM ---------------- */

const $ = id => document.getElementById(id);
const walletCountEl = $('walletCount'), walletEl = $('wallet');
const bowlBtn = $('bowlBtn'), coinSlot = $('coinSlot');
const btnLeft = $('btnLeft'), btnRight = $('btnRight'), btnStart = $('btnStart');
const btnMute = $('btnMute'), muteLabel = $('muteLabel');
const joyStick = $('joyStick');

function renderWallet(bump) {
  if (walletCountEl) walletCountEl.textContent = String(wallet);
  if (bump && walletEl && !REDUCED) {
    walletEl.classList.remove('bump');
    void walletEl.offsetWidth;
    walletEl.classList.add('bump');
  }
}
renderWallet(false);

if (bowlBtn) bowlBtn.addEventListener('click', () => {
  ensureAudio();
  wallet = Math.min(99, wallet + 10);
  saveWallet(); renderWallet(true);
  bowlBtn.classList.remove('pop'); void bowlBtn.offsetWidth; bowlBtn.classList.add('pop');
  sfx.bowl();
  updateInvite();
});

/* ---------------- audio (synthesized, no files) ---------------- */

let ac = null, master = null;
let muted = localStorage.getItem('qw.mute') === '1';
function renderMute() { if (muteLabel) muteLabel.innerHTML = muted ? 'SOUND<br>OFF' : 'SOUND<br>ON'; }
renderMute();

function ensureAudio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.14;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
}
function tone(freq, dur = 0.08, type = 'square', vol = 1, glide = 0, delay = 0) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + glide), t0 + dur);
  gn.gain.setValueAtTime(vol, t0);
  gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(gn); gn.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function hiss(dur = 0.2, vol = 0.5, delay = 0) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const n = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ac.createBufferSource(); src.buffer = buf;
  const gn = ac.createGain(); gn.gain.value = vol;
  src.connect(gn); gn.connect(master); src.start(t0);
}
const sfx = {
  coin() { tone(1244, 0.07, 'square', 0.9); tone(1661, 0.22, 'square', 0.9, 0, 0.07); },
  bowl() { tone(988, 0.05, 'triangle', 0.8); tone(1319, 0.05, 'triangle', 0.8, 0, 0.06); tone(1568, 0.12, 'triangle', 0.8, 0, 0.12); },
  start() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.09, 'square', 0.7, 0, i * 0.09)); },
  collect(c) { tone(440 * Math.pow(2, Math.min(c, 14) / 12), 0.06, 'square', 0.55, 120); },
  power() { [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.06, 'triangle', 0.8, 0, i * 0.05)); },
  bolt() { hiss(0.25, 0.7); tone(180, 0.3, 'sawtooth', 0.6, 900); },
  hurt() { hiss(0.3, 0.8); tone(220, 0.4, 'sawtooth', 0.8, -160); },
  wave() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.07, 'square', 0.6, 0, i * 0.07)); },
  over() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.8, 0, i * 0.2)); },
  letter() { tone(880, 0.04, 'square', 0.5); },
  enter() { tone(1047, 0.08, 'square', 0.7); tone(1568, 0.16, 'square', 0.7, 0, 0.08); },
  miss() { tone(160, 0.09, 'triangle', 0.35); },
};
function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('qw.mute', muted ? '1' : '0'); } catch (e) {}
  renderMute();
  if (!muted) { ensureAudio(); tone(880, 0.06, 'square', 0.5); }
}
if (btnMute) btnMute.addEventListener('click', () => { ensureAudio(); toggleMute(); });

/* ---------------- input ---------------- */

const input = { left: false, right: false, ptrDown: false, ptrX: null };

addEventListener('keydown', (e) => {
  const tag = e.target && e.target.tagName;
  const onWidget = tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA';
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { input.left = true; if (!onWidget) e.preventDefault(); }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { input.right = true; if (!onWidget) e.preventDefault(); }
  // cabinet keys only bite while the cabinet is on screen — Space stays a
  // page-scroll key (and M a letter) once you've walked away down the aisle
  if (e.key === 'm' || e.key === 'M') { if (!onWidget && inView) { ensureAudio(); toggleMute(); } }
  if (mode === 'entry' && !onWidget && inView) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
      e.preventDefault(); entryKey(e.key); return;
    }
  }
  if ((e.key === 'Enter' || e.key === ' ') && !onWidget && inView) {
    if (e.key === ' ' && !['play', 'ready', 'attract', 'table', 'over'].includes(mode)) return;
    e.preventDefault(); action();
  }
});
addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = false;
});

function gameXY(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * GW, y: (e.clientY - r.top) / r.height * GH };
}
canvas.addEventListener('pointerdown', (e) => {
  ensureAudio();
  const p = gameXY(e);
  if (mode === 'entry') { entryTap(p); return; }
  if (mode === 'play' && !demo) {
    input.ptrDown = true; input.ptrX = p.x;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    return;
  }
  action();
});
canvas.addEventListener('pointermove', (e) => {
  if (input.ptrDown) input.ptrX = gameXY(e).x;
});
addEventListener('pointerup', () => { input.ptrDown = false; input.ptrX = null; });
addEventListener('pointercancel', () => { input.ptrDown = false; input.ptrX = null; });

function holdBtn(el, prop) {
  if (!el) return;
  const on = (e) => { ensureAudio(); input[prop] = true; el.classList.add('held'); e.preventDefault(); };
  const off = () => { input[prop] = false; el.classList.remove('held'); };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointerleave', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { input[prop] = true; e.preventDefault(); } });
  el.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') input[prop] = false; });
}
holdBtn(btnLeft, 'left');
holdBtn(btnRight, 'right');
if (btnStart) btnStart.addEventListener('click', () => { ensureAudio(); if (mode === 'entry') entryKey('Enter'); else action(); });
if (coinSlot) coinSlot.addEventListener('click', () => { ensureAudio(); insertCoin(); });

/* ---------------- CRT display (WebGL post pass) ---------------- */

let gl = null, glOk = false, tex = null, uni = {};
let flat2d = null;

const VS = `attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.,1.);}`;
const FS = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime,uPow,uFlick;
vec2 curve(vec2 uv){
  uv=uv*2.0-1.0;
  float r2=dot(uv,uv);
  uv*=1.0+0.075*r2+0.045*r2*r2;
  return uv*0.5+0.5;
}
void main(){
  vec2 uv=curve(vUv);
  float openH=clamp(uPow/0.35,0.004,1.0);
  float openV=clamp((uPow-0.30)/0.62,0.004,1.0);
  vec2 suv=vec2(0.5+(uv.x-0.5)/openH,0.5+(uv.y-0.5)/openV);
  vec3 col=vec3(0.0);
  if(suv.x>=0.0&&suv.x<=1.0&&suv.y>=0.0&&suv.y<=1.0){
    vec2 c=vUv-0.5;
    vec2 off=c*dot(c,c)*0.035;
    col.r=texture2D(uTex,suv+off).r;
    col.g=texture2D(uTex,suv).g;
    col.b=texture2D(uTex,suv-off).b;
    float sl=0.78+0.22*abs(sin(suv.y*288.0*3.14159));
    float gx=mod(gl_FragCoord.x,3.0);
    vec3 grille=gx<1.0?vec3(1.05,0.95,0.95):(gx<2.0?vec3(0.95,1.05,0.95):vec3(0.95,0.95,1.05));
    float vig=pow(16.0*uv.x*(1.0-uv.x)*uv.y*(1.0-uv.y),0.14);
    float flick=1.0-uFlick*0.028*(0.5+0.5*sin(uTime*73.0));
    float roll=fract(uTime*0.055);
    float rd=abs(suv.y-roll);rd=min(rd,1.0-rd);
    float band=1.0+uFlick*0.06*smoothstep(0.13,0.0,rd);
    col=col*sl*vig*flick*grille*band*1.16;
    col+=vec3(0.012,0.03,0.02)*vig;
    col+=vec3(0.9,1.0,0.95)*pow(max(0.0,1.0-uPow),2.5)*0.55*step(0.001,uPow);
  }
  gl_FragColor=vec4(col,1.0);
}`;

function initGL() {
  try {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false })
      || canvas.getContext('experimental-webgl', { alpha: false });
  } catch (e) { gl = null; }
  if (!gl) return false;
  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return false;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  uni.time = gl.getUniformLocation(prog, 'uTime');
  uni.pow = gl.getUniformLocation(prog, 'uPow');
  uni.flick = gl.getUniformLocation(prog, 'uFlick');
  return true;
}
glOk = initGL();
if (!glOk) {
  wrap.classList.add('flat');
  flat2d = canvas.getContext('2d');
}

function resize() {
  const r = wrap.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(r.width * dpr));
  const h = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
    if (glOk) gl.viewport(0, 0, w, h);
  }
}
addEventListener('resize', resize);
resize();

let powT = -1; // <0 = screen dark; ramps 0->1 on power-up
function present(now) {
  if (glOk) {
    const p = powT < 0 ? 0 : Math.min(1, powT);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, gcv);
    gl.uniform1f(uni.time, now / 1000);
    gl.uniform1f(uni.pow, p);
    gl.uniform1f(uni.flick, REDUCED ? 0 : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  } else if (flat2d) {
    flat2d.imageSmoothingEnabled = false;
    flat2d.drawImage(gcv, 0, 0, canvas.width, canvas.height);
  }
}

/* ---------------- game state ---------------- */

let mode = 'off', modeT = 0;
let credits = 0;
let attractPhase = 0;
let score = 0, lives = 3, waveN = 1, caught = 0, combo = 0;
let hi = scores[0].s;
let player = { x: GW / 2, vx: 0 };
let objs = [], parts = [], pops = [], rings = [];
let catchT = 0; // squash-stretch timer: Zip gulps on every catch
let spawnT = 0, powerT = 14, magT = 0, graceT = 0;
let shake = 0, hitStop = 0, redFlash = 0, greenFlash = 0;
let banner = null;
let demo = false;
let entry = { slot: 0, letters: [0, 0, 0] };
let tableNew = -1;
let notice = null; // {txt, t} small marquee message (e.g. bowl prompt)
const stars = Array.from({ length: 14 }, (_, i) => ({
  x: (i * 53 + 17) % GW, y: (i * 97 + 31) % GH, v: 4 + (i % 5) * 2.4,
}));
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function setMode(m) {
  mode = m; modeT = 0;
  if (m !== 'play' && joyStick) joyStick.style.setProperty('--tilt', '0deg');
  updateInvite();
}

function updateInvite() {
  if (!coinSlot) return;
  const inviting = wallet > 0 && credits === 0 &&
    (mode === 'attract' || mode === 'table' || mode === 'ready' || (mode === 'play' && demo));
  coinSlot.classList.toggle('invite', inviting);
  coinSlot.classList.toggle('lit', credits > 0);
}

function insertCoin() {
  if (wallet <= 0) {
    notice = { txt: 'THE BOWL IS FULL - TAKE ONE', t: 2.4 };
    if (bowlBtn) { bowlBtn.classList.remove('plead'); void bowlBtn.offsetWidth; bowlBtn.classList.add('plead'); }
    return false;
  }
  wallet--; saveWallet(); renderWallet(true);
  credits = Math.min(credits + 1, 9);
  sfx.coin();
  if (mode === 'attract' || mode === 'table' || (mode === 'play' && demo)) {
    demo = false; objs = []; parts = []; pops = []; rings = []; catchT = 0;
    setMode('ready');
  }
  updateInvite();
  return true;
}

function action() {
  if (mode === 'attract' || mode === 'table' || mode === 'ready' || (mode === 'play' && demo)) {
    if (credits > 0) startGame(); else insertCoin();
  } else if (mode === 'over' && modeT > 1.2) {
    advanceFromOver();
  }
}

function startGame() {
  credits--;
  powT = Math.min(powT, 0.45); // degauss dip: tube partially collapses, blooms back open
  demo = false;
  score = 0; lives = 3; waveN = 1; caught = 0; combo = 0;
  objs = []; parts = []; pops = []; rings = []; catchT = 0;
  player.x = GW / 2; player.vx = 0;
  spawnT = 0.7; powerT = 13; magT = 0; graceT = 1;
  banner = { txt: 'WAVE 1', t: 1.4 };
  setMode('play');
  sfx.start();
}

function startDemo() {
  demo = true;
  score = 0; lives = 1; waveN = 2; caught = 20; combo = 0;
  objs = []; parts = []; pops = []; rings = []; catchT = 0;
  player.x = GW / 2; player.vx = 0;
  spawnT = 0.4; powerT = 6; magT = 0; graceT = 0.5;
  banner = null;
  setMode('play');
}

function endDemo() {
  demo = false;
  objs = []; parts = []; pops = []; rings = []; catchT = 0;
  attractPhase = 0;
  setMode('attract');
}

/* ---------------- spawning & entities ---------------- */

function spawnObj() {
  const slugChance = Math.min(0.13 + 0.05 * waveN, 0.46);
  const r = Math.random();
  const x = 16 + Math.random() * (GW - 32);
  if (r < slugChance) {
    objs.push({ kind: 'slug', x, y: -8, seed: Math.random() * 7, spin: Math.random() * 6 });
  } else {
    objs.push({ kind: 'tok', x, y: -8, seed: Math.random() * 7, spin: Math.random() * 6 });
  }
}
function spawnPower() {
  const pk = Math.random() < 0.5 ? 'magnet' : 'bolt';
  objs.push({ kind: 'pow', pk, x: 24 + Math.random() * (GW - 48), y: -8, seed: Math.random() * 7 });
}

function burst(x, y, col, n, sp) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random() * 0.9);
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.55 + Math.random() * 0.35, col });
  }
}
function popup(x, y, txt, col) {
  pops.push({ x, y, txt, col, life: 0.9 });
}

/* ---------------- update ---------------- */

function aiSteer() {
  let target = null, best = -1;
  for (const o of objs) {
    if (o.kind === 'slug' || o.y > PY) continue;
    if (o.y > best) { best = o.y; target = o; }
  }
  let dir = 0;
  if (target) dir = Math.sign(target.x - player.x) * (Math.abs(target.x - player.x) > 4 ? 1 : 0);
  for (const o of objs) {
    if (o.kind !== 'slug') continue;
    if (o.y > PY - 64 && Math.abs(o.x - player.x) < 17) dir = player.x > o.x ? 1 : -1;
  }
  return dir;
}

function updatePlay(dt) {
  let dir = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  if (input.ptrDown && input.ptrX != null) {
    const d = input.ptrX - player.x;
    if (Math.abs(d) > 5) dir = Math.sign(d);
  }
  if (demo) dir = aiSteer();

  player.vx += dir * 900 * dt;
  player.vx *= Math.exp(-7.5 * dt);
  player.vx = Math.max(-200, Math.min(200, player.vx));
  player.x += player.vx * dt;
  if (player.x < 14) { player.x = 14; player.vx = 0; }
  if (player.x > GW - 14) { player.x = GW - 14; player.vx = 0; }
  if (joyStick) joyStick.style.setProperty('--tilt', (dir * 14) + 'deg');

  if (graceT > 0) graceT -= dt;
  if (magT > 0) magT -= dt;

  spawnT -= dt;
  if (spawnT <= 0) {
    spawnObj();
    const base = Math.max(0.6 - waveN * 0.045, 0.26);
    spawnT = base * (0.7 + Math.random() * 0.6);
  }
  powerT -= dt;
  if (powerT <= 0) { spawnPower(); powerT = 13 + Math.random() * 5; }

  const fall = 54 * (1 + 0.11 * (waveN - 1));
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i];
    const vy = o.kind === 'slug' ? fall * 1.12 : o.kind === 'pow' ? fall * 0.8 : fall;
    o.y += vy * dt;
    o.x += Math.sin(o.seed + o.y * 0.045) * 12 * dt;
    if (o.kind === 'tok' && magT > 0) {
      const dx = player.x - o.x, dy = PY - o.y;
      const d = Math.hypot(dx, dy);
      if (d < 110 && dy > 0) { o.x += dx / d * 130 * dt; o.y += dy / d * 60 * dt; }
    }
    // catch?
    if (Math.abs(o.x - player.x) < 13 && Math.abs(o.y - PY) < 11) {
      if (o.kind === 'tok') {
        caught++; combo++;
        const pts = 25 + 5 * Math.min(combo, 15);
        score += pts;
        if (score > hi) hi = score;
        popup(o.x, o.y - 8, '+' + pts, '#FFD35C');
        burst(o.x, o.y, '#FFB300', 8, 90);
        rings.push({ x: o.x, y: o.y, r: 4, life: 0.26, col: '#FFD35C' });
        catchT = 0.16;
        sfx.collect(combo);
        if (caught % 14 === 0) {
          waveN++;
          banner = { txt: 'WAVE ' + waveN, t: 1.4 };
          sfx.wave();
        }
      } else if (o.kind === 'pow') {
        if (o.pk === 'magnet') {
          magT = 6;
          banner = { txt: 'MAGNET!', t: 1.1 };
        } else {
          let zapped = 0;
          for (let j = objs.length - 1; j >= 0; j--) {
            if (objs[j].kind === 'slug') {
              burst(objs[j].x, objs[j].y, '#7CFF9E', 10, 110);
              score += 50; zapped++;
              objs.splice(j, 1); if (j < i) i--;
            }
          }
          if (score > hi) hi = score;
          greenFlash = 0.5;
          banner = { txt: zapped ? 'BOLT! +' + (zapped * 50) : 'BOLT!', t: 1.1 };
        }
        burst(o.x, o.y, '#3DFF74', 12, 120);
        rings.push({ x: o.x, y: o.y, r: 6, life: 0.4, col: '#7CFF9E' });
        catchT = 0.16;
        sfx.power(); if (o.pk === 'bolt') sfx.bolt();
      } else if (o.kind === 'slug' && graceT <= 0) {
        objs.splice(i, 1);
        hitSlug();
        return;
      } else {
        // slug during grace: shrug it off
        burst(o.x, o.y, '#8E8E9E', 5, 60);
      }
      objs.splice(i, 1);
      continue;
    }
    if (o.y > GH + 10) {
      if (o.kind === 'tok') {
        if (combo > 4) popup(o.x, GH - 14, 'MISS', '#6e6488');
        combo = 0;
        sfx.miss();
      }
      objs.splice(i, 1);
    }
  }

  if (demo && modeT > 9) endDemo();
}

function hitSlug() {
  lives--;
  combo = 0;
  burst(player.x, PY, '#FF4B4B', 16, 140);
  burst(player.x, PY, '#8E8E9E', 10, 90);
  rings.push({ x: player.x, y: PY, r: 6, life: 0.45, col: '#FF4B4B' });
  sfx.hurt();
  if (!REDUCED) { shake = 1; hitStop = 0.32; }
  redFlash = 0.6;
  if (demo) { endDemo(); return; }
  setMode('dying');
}

function qualify(s) { return s > 0 && s > scores[scores.length - 1].s; }

function advanceFromOver() {
  if (qualify(score)) {
    entry = { slot: 0, letters: [0, 0, 0] };
    setMode('entry');
  } else {
    tableNew = -1;
    setMode('table');
  }
}

function commitEntry() {
  const name = entry.letters.map(i => LETTERS[i]).join('');
  scores.push({ n: name, s: score });
  scores.sort((a, b) => b.s - a.s);
  scores = scores.slice(0, 8);
  tableNew = scores.findIndex(r => r.n === name && r.s === score);
  saveScores();
  sfx.enter();
  setMode('table');
}

function entryKey(k) {
  if (k === 'ArrowUp') { entry.letters[entry.slot] = (entry.letters[entry.slot] + 25) % 26; sfx.letter(); }
  else if (k === 'ArrowDown') { entry.letters[entry.slot] = (entry.letters[entry.slot] + 1) % 26; sfx.letter(); }
  else if (k === 'ArrowLeft') { entry.slot = Math.max(0, entry.slot - 1); sfx.letter(); }
  else if (k === 'ArrowRight') { entry.slot = Math.min(2, entry.slot + 1); sfx.letter(); }
  else if (k === 'Enter' || k === ' ') {
    if (entry.slot < 2) { entry.slot++; sfx.letter(); } else commitEntry();
  }
}
function entryTap(p) {
  const xs = [GW / 2 - 42, GW / 2, GW / 2 + 42];
  let slot = 0, bd = 1e9;
  xs.forEach((x, i) => { const d = Math.abs(p.x - x); if (d < bd) { bd = d; slot = i; } });
  entry.slot = slot;
  if (p.y < 150) entry.letters[slot] = (entry.letters[slot] + 25) % 26;
  else if (p.y > 176) entry.letters[slot] = (entry.letters[slot] + 1) % 26;
  sfx.letter();
}

function update(dt) {
  modeT += dt;
  for (const s of stars) { s.y += s.v * dt; if (s.y > GH) { s.y = -2; s.x = Math.random() * GW; } }
  if (banner && (banner.t -= dt) <= 0) banner = null;
  if (notice && (notice.t -= dt) <= 0) notice = null;
  if (redFlash > 0) redFlash -= dt * 1.6;
  if (greenFlash > 0) greenFlash -= dt * 1.6;
  if (shake > 0) shake = Math.max(0, shake - dt * 2.6);

  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vy += 160 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    p.life -= dt; p.y -= 22 * dt;
    if (p.life <= 0) pops.splice(i, 1);
  }
  if (catchT > 0) catchT -= dt;
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.life -= dt; r.r += 95 * dt;
    if (r.life <= 0) rings.splice(i, 1);
  }

  switch (mode) {
    case 'boot':
      if (modeT > 2.7) { attractPhase = 0; setMode('attract'); }
      break;
    case 'attract': {
      const spans = REDUCED ? [5, 5.5] : [4.5, 4.5];
      if (attractPhase === 0 && modeT > spans[0]) { attractPhase = 1; modeT = 0; }
      else if (attractPhase === 1 && modeT > spans[1]) {
        if (REDUCED) { attractPhase = 0; modeT = 0; }
        else startDemo();
      }
      break;
    }
    case 'ready':
      break;
    case 'play':
      updatePlay(dt);
      break;
    case 'dying':
      if (modeT > 1.05) {
        if (lives > 0) {
          objs = objs.filter(o => o.kind !== 'slug');
          graceT = 1.4;
          setMode('play');
        } else {
          sfx.over();
          setMode('over');
        }
      }
      break;
    case 'over':
      if (modeT > 2.6) advanceFromOver();
      break;
    case 'entry':
      break;
    case 'table':
      if (modeT > 7) { attractPhase = 0; demo = false; setMode('attract'); }
      break;
  }
}

/* ---------------- drawing ---------------- */

const FONT = '"Press Start 2P", monospace';
function pt(txt, x, y, col, size = 8, align = 'left') {
  g.font = size + 'px ' + FONT;
  g.textAlign = align;
  g.textBaseline = 'top';
  g.fillStyle = col;
  g.fillText(txt, Math.round(x), Math.round(y));
}

function drawZip(x, y, blink) {
  x = Math.round(x);
  if (blink && Math.floor(modeT * 12) % 2 === 0) return;
  const t = performance.now() / 1000;
  const sq = catchT > 0 ? 1 : 0; // gulp: squash wide + low for a couple frames
  // wheels
  g.fillStyle = '#8a2560';
  g.fillRect(x - 8 - sq, y + 6, 4, 3); g.fillRect(x + 4 + sq, y + 6, 4, 3);
  // body
  g.fillStyle = '#1d9e4b';
  g.fillRect(x - 9 - sq, y - 2 + sq, 18 + sq * 2, 8 - sq);
  g.fillStyle = '#3DFF74';
  g.fillRect(x - 8 - sq, y - 4 + sq, 16 + sq * 2, 8 - sq);
  // visor eyes
  g.fillStyle = '#062012';
  g.fillRect(x - 6 - sq, y - 2 + sq, 12 + sq * 2, 4);
  g.fillStyle = '#EAFFF2';
  const look = Math.max(-2, Math.min(2, Math.round(player.vx / 60)));
  g.fillRect(x - 4 + look, y - 1 + sq, 2, 2);
  g.fillRect(x + 2 + look, y - 1 + sq, 2, 2);
  // antenna + spark (flares on a catch)
  g.fillStyle = '#2bd96a';
  g.fillRect(x - 1, y - 9 + sq, 2, 5 - sq);
  const sp = Math.floor(t * 14) % 3;
  g.fillStyle = sq ? '#FFF6D8' : sp === 0 ? '#FFE28A' : sp === 1 ? '#FFB300' : '#FFF6D8';
  g.fillRect(x - 2 - sq, y - 12 + sq, 4 + sq * 2, 3);
  if (sp === 0 || sq) { g.fillRect(x - 4 - sq, y - 11 + sq, 2, 1); g.fillRect(x + 2 + sq, y - 11 + sq, 2, 1); }
  // magnet aura
  if (magT > 0) {
    g.strokeStyle = 'rgba(61,255,116,' + (0.25 + 0.2 * Math.sin(t * 10)) + ')';
    g.lineWidth = 1;
    g.beginPath(); g.arc(x, y, 16 + Math.sin(t * 6) * 2, 0, 7); g.stroke();
  }
}

function drawToken(o) {
  const w = Math.abs(Math.cos(o.spin + o.y * 0.06));
  const rx = Math.max(2, 7 * w);
  g.fillStyle = '#FFB300';
  g.beginPath(); g.ellipse(o.x, o.y, rx, 7, 0, 0, 7); g.fill();
  if (rx > 3.5) {
    g.strokeStyle = '#8a5f07'; g.lineWidth = 1.4;
    g.beginPath(); g.ellipse(o.x, o.y, rx * 0.62, 4.4, 0, 0, 7); g.stroke();
    g.fillStyle = '#FFE9A8';
    g.fillRect(Math.round(o.x - rx * 0.4), Math.round(o.y - 4), 2, 2);
  }
}
function drawSlug(o) {
  const w = Math.abs(Math.cos(o.spin + o.y * 0.05));
  const rx = Math.max(2, 7 * w);
  g.fillStyle = '#8E8E9E';
  g.beginPath(); g.ellipse(o.x, o.y, rx, 7, 0, 0, 7); g.fill();
  if (rx > 3.5) {
    g.strokeStyle = '#4c4c58'; g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(o.x - 3, o.y - 3); g.lineTo(o.x + 3, o.y + 3);
    g.moveTo(o.x + 3, o.y - 3); g.lineTo(o.x - 3, o.y + 3);
    g.stroke();
  }
}
function drawPower(o) {
  const t = performance.now() / 1000;
  const r = 6 + Math.sin(t * 7 + o.seed) * 1.5;
  g.fillStyle = o.pk === 'magnet' ? '#3DFF74' : '#7CFF9E';
  g.beginPath();
  g.moveTo(o.x, o.y - r); g.lineTo(o.x + r, o.y); g.lineTo(o.x, o.y + r); g.lineTo(o.x - r, o.y);
  g.closePath(); g.fill();
  g.fillStyle = '#04310f';
  g.font = '6px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(o.pk === 'magnet' ? 'M' : 'B', o.x, o.y + 1);
  g.textBaseline = 'top';
}

function drawChute() {
  g.strokeStyle = 'rgba(61,255,116,0.18)';
  g.lineWidth = 1;
  for (const x of [6, GW - 6]) {
    g.beginPath(); g.moveTo(x, 26); g.lineTo(x, GH - 12); g.stroke();
  }
  g.fillStyle = 'rgba(61,255,116,0.14)';
  for (let y = 34; y < GH - 16; y += 24) {
    g.fillRect(3, y, 6, 1); g.fillRect(GW - 9, y, 6, 1);
  }
  // floor
  g.fillStyle = 'rgba(61,255,116,0.35)';
  g.fillRect(4, GH - 12, GW - 8, 2);
}

function drawHUD() {
  pt('SCORE', 8, 5, '#7CFF9E');
  pt(String(score), 8, 15, '#EAFFF2');
  pt('HI', GW / 2, 5, '#7CFF9E', 8, 'center');
  pt(String(hi), GW / 2, 15, '#FFD35C', 8, 'center');
  // lives
  for (let i = 0; i < lives; i++) {
    const lx = GW - 12 - i * 14;
    g.fillStyle = '#3DFF74'; g.fillRect(lx - 5, 8, 10, 5);
    g.fillStyle = '#FFB300'; g.fillRect(lx - 1, 4, 2, 2);
  }
  pt('WAVE ' + waveN, 8, GH - 9, '#6e6488', 8);
  if (combo > 1) pt('x' + combo, GW - 8, GH - 9, combo > 9 ? '#FFD35C' : '#7CFF9E', 8, 'right');
  if (magT > 0) {
    g.fillStyle = 'rgba(61,255,116,0.5)';
    g.fillRect(GW / 2 - 20, GH - 7, Math.max(0, 40 * (magT / 6)), 2);
  }
}

function drawStars(alpha) {
  g.fillStyle = 'rgba(120,110,160,' + alpha + ')';
  for (const s of stars) g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
}

function drawTitle() {
  drawStars(0.5);
  const t = modeT;
  // logo
  pt('TOKEN', GW / 2, 58, '#FFB300', 16, 'center');
  pt('RUNNER', GW / 2, 80, '#F23DA6', 16, 'center');
  g.fillStyle = 'rgba(255,179,0,0.25)';
  g.fillRect(GW / 2 - 56, 104, 112, 1);
  pt('QUARTERWORLD', GW / 2, 112, '#7CFF9E', 8, 'center');
  pt('HOUSE GAME NO.1', GW / 2, 124, '#6e6488', 8, 'center');
  drawZip(GW / 2 + Math.sin(t * 1.1) * 46, 170, false);
  drawToken({ x: GW / 2 + Math.sin(t * 1.1) * 46, y: 148 - ((t * 60) % 34), spin: t * 4 });
  if (Math.floor(t * 2) % 2 === 0) {
    pt(credits > 0 ? 'PRESS START' : 'INSERT TOKEN', GW / 2, 216, '#EAFFF2', 8, 'center');
  }
  pt('1 TOKEN PER PLAY', GW / 2, 238, '#6e6488', 8, 'center');
  pt('(c)1984 QUARTERWORLD', GW / 2, 268, '#4a4258', 8, 'center');
}

function drawScoresScreen() {
  drawStars(0.5);
  pt('TODAYS BEST', GW / 2, 34, '#FFB300', 8, 'center');
  pt('SINCE 1984', GW / 2, 46, '#6e6488', 8, 'center');
  scores.forEach((r, i) => {
    const y = 74 + i * 20;
    const hot = mode === 'table' && i === tableNew && Math.floor(modeT * 4) % 2 === 0;
    pt(String(i + 1), 34, y, '#6e6488');
    pt(r.n, 66, y, hot ? '#FFE28A' : i === 0 ? '#FFD35C' : '#7CFF9E');
    pt(String(r.s), GW - 30, y, hot ? '#FFE28A' : '#EAFFF2', 8, 'right');
  });
  if (mode === 'table' && tableNew >= 0) {
    pt('WELCOME TO THE WALL', GW / 2, 244, '#F23DA6', 8, 'center');
  } else if (Math.floor(modeT * 2) % 2 === 0) {
    pt(credits > 0 ? 'PRESS START' : 'INSERT TOKEN', GW / 2, 244, '#EAFFF2', 8, 'center');
  }
}

function drawBoot() {
  const lines = [
    [0.25, 'QUARTERWORLD BIOS 1.02'],
    [0.7, 'RAM 4K ........ OK'],
    [1.1, 'RGB GUNS ...... OK'],
    [1.5, 'COIN MECH ..... OK'],
    [1.9, 'PHOSPHOR ...... WARM'],
    [2.3, 'HELLO MARGE'],
  ];
  let y = 30;
  for (const [at, txt] of lines) {
    if (modeT > at) { pt(txt, 16, y, '#7CFF9E'); }
    y += 16;
  }
  if (Math.floor(modeT * 3) % 2 === 0) {
    g.fillStyle = '#7CFF9E';
    g.fillRect(16, y + 2, 8, 10);
  }
}

function drawReady() {
  drawStars(0.5);
  pt('CREDIT ' + credits, GW / 2, 96, '#EAFFF2', 8, 'center');
  if (Math.floor(modeT * 2.5) % 2 === 0) pt('PRESS START', GW / 2, 136, '#FFB300', 16, 'center');
  pt('CATCH TOKENS', GW / 2, 186, '#7CFF9E', 8, 'center');
  pt('DODGE SLUGS', GW / 2, 200, '#8E8E9E', 8, 'center');
  drawZip(GW / 2, PY, false);
}

function drawPlay() {
  drawStars(0.35);
  drawChute();
  for (const o of objs) {
    if (o.kind === 'tok') drawToken(o);
    else if (o.kind === 'slug') drawSlug(o);
    else drawPower(o);
  }
  if (mode !== 'dying') drawZip(player.x, PY, graceT > 0);
  drawHUD();
  if (demo) {
    if (Math.floor(modeT * 3) % 2 === 0) pt('DEMO', GW / 2, 132, '#F23DA6', 16, 'center');
    pt('INSERT TOKEN', GW / 2, 156, '#EAFFF2', 8, 'center');
  }
}

function drawOver() {
  drawStars(0.4);
  drawChute();
  drawHUD();
  pt('GAME OVER', GW / 2, 118, '#FF4B4B', 16, 'center');
  pt('SCORE ' + score, GW / 2, 150, '#EAFFF2', 8, 'center');
  if (qualify(score)) pt('YOU MADE THE WALL', GW / 2, 168, '#FFD35C', 8, 'center');
}

function drawEntry() {
  drawStars(0.4);
  pt('NICE RUN', GW / 2, 44, '#FFB300', 16, 'center');
  pt('SCORE ' + score, GW / 2, 74, '#EAFFF2', 8, 'center');
  pt('SIGN THE WALL', GW / 2, 96, '#7CFF9E', 8, 'center');
  const xs = [GW / 2 - 42, GW / 2, GW / 2 + 42];
  for (let i = 0; i < 3; i++) {
    const active = i === entry.slot;
    const ch = LETTERS[entry.letters[i]];
    if (active) {
      pt('^', xs[i], 130, '#7CFF9E', 8, 'center');
      pt('v', xs[i], 184, '#7CFF9E', 8, 'center');
    }
    if (!active || Math.floor(modeT * 4) % 2 === 0) {
      pt(ch, xs[i], 150, active ? '#FFE28A' : '#EAFFF2', 16, 'center');
    }
    g.fillStyle = active ? '#FFB300' : '#4a4258';
    g.fillRect(xs[i] - 10, 172, 20, 2);
  }
  pt('ARROWS PICK - ENTER SETS', GW / 2, 216, '#6e6488', 8, 'center');
  pt('OR TAP ABOVE / BELOW', GW / 2, 230, '#6e6488', 8, 'center');
}

function draw() {
  // phosphor persistence: translucent clear
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = mode === 'boot' && modeT < 0.1 ? '#050309' : 'rgba(5,3,9,0.5)';
  g.fillRect(0, 0, GW, GH);

  if (shake > 0 && !REDUCED) {
    const s = shake * 3.2;
    g.setTransform(1, 0, 0, 1, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  switch (mode) {
    case 'boot': drawBoot(); break;
    case 'attract': attractPhase === 0 ? drawTitle() : drawScoresScreen(); break;
    case 'ready': drawReady(); break;
    case 'play': drawPlay(); break;
    case 'dying': drawPlay(); break;
    case 'over': drawOver(); break;
    case 'entry': drawEntry(); break;
    case 'table': drawScoresScreen(); break;
  }

  // particles & popups
  for (const p of parts) {
    g.globalAlpha = Math.max(0, Math.min(1, p.life * 2.2));
    g.fillStyle = p.col;
    g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  g.globalAlpha = 1;
  for (const r of rings) {
    g.globalAlpha = Math.max(0, Math.min(1, r.life * 3));
    g.strokeStyle = r.col; g.lineWidth = 1.4;
    g.beginPath(); g.arc(r.x, r.y, r.r, 0, 7); g.stroke();
  }
  g.globalAlpha = 1;
  for (const p of pops) {
    g.globalAlpha = Math.max(0, Math.min(1, p.life * 1.8));
    pt(p.txt, p.x, p.y, p.col, 8, 'center');
  }
  g.globalAlpha = 1;

  if (banner) {
    const a = Math.min(1, banner.t * 3);
    g.globalAlpha = a;
    g.fillStyle = 'rgba(5,3,9,0.75)';
    g.fillRect(0, 126, GW, 34);
    pt(banner.txt, GW / 2, 136, '#FFB300', 16, 'center');
    g.globalAlpha = 1;
  }
  if (notice) {
    g.fillStyle = 'rgba(5,3,9,0.8)';
    g.fillRect(0, GH / 2 - 12, GW, 24);
    pt(notice.txt, GW / 2, GH / 2 - 4, '#FFD35C', 8, 'center');
  }

  g.setTransform(1, 0, 0, 1, 0, 0);
  if (redFlash > 0) {
    g.fillStyle = 'rgba(255,40,40,' + (redFlash * 0.32) + ')';
    g.fillRect(0, 0, GW, GH);
  }
  if (greenFlash > 0) {
    g.fillStyle = 'rgba(61,255,116,' + (greenFlash * 0.22) + ')';
    g.fillRect(0, 0, GW, GH);
  }
}

/* ---------------- main loop ---------------- */

let rafId = 0, last = 0, running = false, booted = false;
let inView = false, tabVisible = !document.hidden;
let fontsWarm = false; // never draw BIOS text in a fallback face

function frame(now) {
  rafId = requestAnimationFrame(frame);
  let dt = Math.min((now - last) / 1000, 0.035);
  last = now;

  if (powT >= 0 && powT < 1) powT = Math.min(1, powT + dt * (REDUCED ? 4 : 1.15));

  if (hitStop > 0) {
    hitStop -= dt;
    present(now);
    return;
  }
  update(dt);
  draw();
  present(now);
}

function setRunning(v) {
  if (v === running) return;
  running = v;
  if (running) {
    last = performance.now();
    rafId = requestAnimationFrame(frame);
    if (ac && ac.state === 'suspended') ac.resume();
  } else {
    cancelAnimationFrame(rafId);
  }
}
function evalRunning() { setRunning(inView && tabVisible); }

const io = new IntersectionObserver((entries) => {
  for (const e of entries) inView = e.isIntersecting;
  evalRunning();
  if (inView && !booted && fontsWarm) boot();
}, { threshold: 0.12 });
io.observe(wrap);

document.addEventListener('visibilitychange', () => {
  tabVisible = !document.hidden;
  evalRunning();
});

function boot() {
  if (booted) return;
  booted = true;
  powT = 0;
  g.fillStyle = '#050309';
  g.fillRect(0, 0, GW, GH);
  setMode('boot');
}

// QA hook for automated verification only (never active on normal loads)
if (location.search.indexOf('qa=1') >= 0) {
  window.QW_QA = {
    endRun(s) { score = s; if (score > hi) hi = score; lives = 0; demo = false; setMode('over'); modeT = 2.55; },
    mode: () => mode,
  };
}

// warm the pixel font for canvas use; boot is gated on this (1.2s cap)
const fontReady = document.fonts && document.fonts.load
  ? document.fonts.load('8px "Press Start 2P"').catch(() => {})
  : Promise.resolve();
Promise.race([fontReady, new Promise(r => setTimeout(r, 1200))]).then(() => {
  fontsWarm = true;
  resize();
  if (inView && !booted) boot();
});
})();
