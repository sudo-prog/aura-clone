/* ============================================================
   KALIBER 72 — a working Swiss-lever escapement in SVG.
   Real horology:
     21,600 A/h  →  3 Hz balance, 6 beats/s
     escape wheel: 15 club teeth, 12°/beat, one rev per 5 s
     train: barrel 1/8h → center 1/h (64:8) → third 8/h (60:8)
            → fourth 1/min (72:6) → escape 12/min
     fourth wheel steps 1° per beat — the true mechanical sweep
   Hands read the viewer's actual local time.
   ============================================================ */
(() => {
'use strict';

const NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('caliber');
if (!svg) return;

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- tiny helpers ---------- */
const el = (name, attrs, parent) => {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};
const P = (r, aDeg, cx = 0, cy = 0) => {
  const a = aDeg * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const f2 = n => Math.round(n * 100) / 100;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, u) => a + (b - a) * u;
const easeIO = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const easeOutBack = u => { const c = 1.55; u = clamp(u, 0, 1); return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
const easeOutCubic = u => 1 - Math.pow(1 - clamp(u, 0, 1), 3);

/* ---------- movement geometry (local 1000×1000 plate space) ---------- */
const MC   = { x: 500, y: 500 };            // mainplate center
const PLATE_R = 392;
const BAL  = { x: 272, y: 478, r: 118 };    // balance
const ESC  = { x: 465, y: 715, r: 54  };    // escape wheel, 15 teeth
const FTH  = { x: 585, y: 770, r: 66  };    // fourth wheel — small seconds
const THD  = { x: 648, y: 642, r: 88  };    // third wheel
const CTR  = { x: 500, y: 500, r: 108 };    // center wheel
const BRL  = { x: 562, y: 278, r: 132 };    // barrel
const PAL  = { x: BAL.x + .56 * (ESC.x - BAL.x), y: BAL.y + .56 * (ESC.y - BAL.y) };
const AXIS_DEG = Math.atan2(ESC.y - PAL.y, ESC.x - PAL.x) * 180 / Math.PI;
const PE = Math.hypot(ESC.x - PAL.x, ESC.y - PAL.y);   // ≈134.5
const AMP = 250;          // balance amplitude, degrees (high, healthy)
const FORK = 8.5;         // pallet-fork banking angle
const SPR = { r0: 24, k: 1.05, turns: 8, stud: -142 * Math.PI / 180 };

/* ---------- path builders ---------- */
function gearD(rRoot, rTip, teeth, rootFrac = .42, tipFrac = .22) {
  const pitch = 360 / teeth; let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * pitch;
    const [x0, y0] = P(rRoot, a), [x1, y1] = P(rRoot, a + pitch * rootFrac);
    const [x2, y2] = P(rTip, a + pitch * (rootFrac + (1 - rootFrac - tipFrac) / 2));
    const [x3, y3] = P(rTip, a + pitch * (rootFrac + tipFrac + (1 - rootFrac - tipFrac) / 2));
    d += (i ? 'L' : 'M') + f2(x0) + ' ' + f2(y0)
      + `A${f2(rRoot)} ${f2(rRoot)} 0 0 1 ${f2(x1)} ${f2(y1)}`
      + `L${f2(x2)} ${f2(y2)}A${f2(rTip)} ${f2(rTip)} 0 0 1 ${f2(x3)} ${f2(y3)}`;
  }
  return d + 'Z';
}
function clubD(rRoot, rTip, teeth) {           // escape-wheel club teeth
  const pitch = 360 / teeth; let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * pitch;
    const [x0, y0] = P(rRoot, a);
    const [x1, y1] = P(rRoot, a + pitch * .30);
    const [x2, y2] = P(rTip, a + pitch * .60);       // leaning tip
    const [x3, y3] = P(rTip * .965, a + pitch * .78); // impulse face
    d += (i ? 'L' : 'M') + f2(x0) + ' ' + f2(y0)
      + `A${rRoot} ${rRoot} 0 0 1 ${f2(x1)} ${f2(y1)}`
      + `L${f2(x2)} ${f2(y2)}L${f2(x3)} ${f2(y3)}`;
  }
  return d + 'Z';
}
function sectorHoleD(r1, r2, a0, a1) {
  const [x0, y0] = P(r1, a0), [x1, y1] = P(r1, a1), [x2, y2] = P(r2, a1), [x3, y3] = P(r2, a0);
  const large = (a1 - a0) > 180 ? 1 : 0;
  return `M${f2(x0)} ${f2(y0)}A${r1} ${r1} 0 ${large} 1 ${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}A${r2} ${r2} 0 ${large} 0 ${f2(x3)} ${f2(y3)}Z`;
}
function ringD(rOut, rIn) {
  return `M${f2(rOut)} 0A${rOut} ${rOut} 0 1 1 ${f2(-rOut)} 0A${rOut} ${rOut} 0 1 1 ${f2(rOut)} 0Z`
       + `M${f2(rIn)} 0A${rIn} ${rIn} 0 1 0 ${f2(-rIn)} 0A${rIn} ${rIn} 0 1 0 ${f2(rIn)} 0Z`;
}

/* ---------- defs ---------- */
const defs = el('defs', {}, svg);
function grad(id, type, stops, attrs = {}) {
  const g = el(type, { id, ...attrs }, defs);
  for (const [off, col, op] of stops)
    el('stop', { offset: off, 'stop-color': col, ...(op != null ? { 'stop-opacity': op } : {}) }, g);
  return g;
}
grad('gBrass', 'radialGradient', [['0%', '#EDD9A3'], ['45%', '#C29B4A'], ['100%', '#8A6828']], { cx: '.36', cy: '.32', r: '.85' });
grad('gBrassDeep', 'radialGradient', [['0%', '#D8B45E'], ['60%', '#A57E33'], ['100%', '#6B4E1C']], { cx: '.4', cy: '.35', r: '.9' });
grad('gRhod', 'radialGradient', [['0%', '#CDD1D7'], ['55%', '#8F959D'], ['100%', '#565B63']], { cx: '.38', cy: '.3', r: '.95' });
grad('gGilt', 'radialGradient', [['0%', '#F2E4B8'], ['50%', '#CBB068'], ['100%', '#8E7434']], { cx: '.38', cy: '.32', r: '.9' });
grad('gSteel', 'linearGradient', [['0%', '#8FB0E8'], ['45%', '#4A6FB5'], ['100%', '#172A52']], { x1: 0, y1: 0, x2: 1, y2: 1 });
grad('gRuby', 'radialGradient', [['0%', '#E86E7D'], ['55%', '#A62639'], ['100%', '#57101C']], { cx: '.4', cy: '.35', r: '.9' });
grad('gPlate', 'radialGradient', [['0%', '#4E5157'], ['60%', '#2E3034'], ['100%', '#1D1F22']], { cx: '.42', cy: '.3', r: '1' });
grad('gShadow', 'radialGradient', [['0%', '#000', .55], ['70%', '#000', .28], ['100%', '#000', 0]]);
const rib = el('pattern', { id: 'ribbing', width: 26, height: 26, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(28)' }, defs);
el('rect', { width: 26, height: 26, fill: '#fff', opacity: .016 }, rib);
el('rect', { width: 13, height: 26, fill: '#fff', opacity: .03 }, rib);

/* ---------- scene skeleton ---------- */
const sheet = el('g', { id: 'sheet', opacity: 0 }, svg);
const stage = el('g', { id: 'stage' }, svg);
const movement = el('g', { id: 'movement' }, stage);
const annot = el('g', { id: 'annot' }, svg);

const layers = {};
for (const id of ['plate', 'barrel', 'train', 'esc', 'dial']) {
  const g = el('g', { id: 'ly-' + id }, movement);
  layers[id] = { g, shadow: el('ellipse', { fill: 'url(#gShadow)', opacity: 0 }, g) };
}

/* jewel in a gold chaton */
function chaton(parent, cx, cy, r) {
  el('circle', { cx, cy, r: r + 3.6, fill: 'url(#gBrassDeep)', stroke: '#5C431A', 'stroke-width': .8 }, parent);
  el('circle', { cx, cy, r, fill: 'url(#gRuby)', stroke: '#3F0A13', 'stroke-width': .6 }, parent);
  el('circle', { cx: cx - r * .3, cy: cy - r * .35, r: r * .28, fill: '#F2A5AE', opacity: .8 }, parent);
}
function screwHead(parent, cx, cy, r, slotDeg, blued = true) {
  el('circle', { cx, cy, r, fill: blued ? 'url(#gSteel)' : 'url(#gBrassDeep)', stroke: '#0B0F1C', 'stroke-width': .7 }, parent);
  const [sx, sy] = P(r * .78, slotDeg), [ex, ey] = P(r * .78, slotDeg + 180);
  el('line', { x1: cx + sx, y1: cy + sy, x2: cx + ex, y2: cy + ey, stroke: '#060911', 'stroke-width': r * .3, 'stroke-linecap': 'round' }, parent);
}
/* a train wheel: toothed rim, spoke cut-outs, pinion, hub */
function wheel(parent, spec) {
  const { cx, cy, rTip, teeth, arms, fill = 'url(#gBrass)', hub = 16, rimIn } = spec;
  const g = el('g', {}, parent);
  const rRoot = rTip - Math.max(5, rTip * .055);
  const inner = rimIn || rRoot - Math.max(7, rTip * .08);
  let d = gearD(rRoot, rTip, teeth);
  const gap = 360 / arms;
  for (let i = 0; i < arms; i++)
    d += sectorHoleD(hub + 8, inner, i * gap + 12, (i + 1) * gap - 12);
  if (spec.pinion) el('path', { d: gearD(spec.pinion - 2.5, spec.pinion, 9, .45, .25), transform: `translate(${cx} ${cy})`, fill: 'url(#gRhod)', stroke: '#3A3E45', 'stroke-width': .6 }, g);
  const rot = el('g', {}, g);
  el('path', { d, transform: `translate(${cx} ${cy})`, fill, 'fill-rule': 'evenodd', stroke: 'rgba(30,20,5,.55)', 'stroke-width': 1 }, rot);
  el('circle', { cx, cy, r: inner, fill: 'none', stroke: 'rgba(30,20,5,.35)', 'stroke-width': 1 }, rot);
  el('circle', { cx, cy, r: hub, fill: 'url(#gRhod)', stroke: '#3A3E45', 'stroke-width': .8 }, rot);
  spec.rot = rot; spec.g = g;
  return spec;
}
const rotate = (node, deg, cx, cy) => node.setAttribute('transform', `rotate(${deg} ${cx} ${cy})`);

/* ================= PLATE LAYER ================= */
{
  const g = layers.plate.g;
  // ground shadow — the caliber sits on the leather
  el('ellipse', { cx: MC.x, cy: MC.y + PLATE_R * .16, rx: PLATE_R * 1.18, ry: PLATE_R * .52, fill: 'url(#gShadow)', opacity: .5 }, g);
  el('circle', { cx: MC.x, cy: MC.y, r: PLATE_R, fill: 'url(#gPlate)', stroke: '#17181B', 'stroke-width': 2 }, g);
  el('circle', { cx: MC.x, cy: MC.y, r: PLATE_R, fill: 'url(#ribbing)' }, g);
  el('circle', { cx: MC.x, cy: MC.y, r: PLATE_R - 10, fill: 'none', stroke: 'rgba(255,255,255,.07)', 'stroke-width': 1 }, g);
  el('circle', { cx: MC.x, cy: MC.y, r: PLATE_R - 16, fill: 'none', stroke: 'rgba(0,0,0,.35)', 'stroke-width': 1 }, g);
  // edge screws
  [22, 95, 152, 210, 268, 330].forEach((a, i) => {
    const [x, y] = P(PLATE_R - 32, a, MC.x, MC.y);
    screwHead(g, x, y, 7, a * 1.7 + i * 40);
  });
  // lower pivot jewels, set in gold chatons — 6 of the 23
  for (const p of [CTR, THD, FTH, ESC, PAL, BAL]) chaton(g, p.x, p.y, 4.6);
  // engraving
  const eng = (txt, x, y, size) => {
    el('text', { x, y: y + 1.2, class: 'svg-mono', 'font-size': size, 'letter-spacing': 2, 'text-anchor': 'middle', fill: 'rgba(255,255,255,.15)' }, g).textContent = txt;
    el('text', { x, y, class: 'svg-mono', 'font-size': size, 'letter-spacing': 2, 'text-anchor': 'middle', fill: '#1D1F23' }, g).textContent = txt;
  };
  eng('HANDARBEIT · GLASHÜTTE I/SA', 352, 812, 13);
  eng('GERMAN SILVER — NR. 037', 352, 833, 11);
}

/* ================= BARREL LAYER ================= */
const wBarrel = wheel(layers.barrel.g, { cx: BRL.x, cy: BRL.y, rTip: BRL.r, teeth: 80, arms: 1, hub: 100, rimIn: 118 });
{
  const g = layers.barrel.g;
  // barrel drum lid over the spoke area
  el('circle', { cx: BRL.x, cy: BRL.y, r: 116, fill: 'url(#gBrassDeep)', stroke: 'rgba(30,20,5,.5)', 'stroke-width': 1 }, g);
  el('circle', { cx: BRL.x, cy: BRL.y, r: 98, fill: 'none', stroke: 'rgba(60,40,10,.5)', 'stroke-width': 1.2 }, g);
  // ratchet wheel with sunray snailing
  const rat = el('g', {}, g);
  el('path', { d: gearD(82, 88, 48, .3, .25), transform: `translate(${BRL.x} ${BRL.y})`, fill: 'url(#gBrass)', stroke: 'rgba(30,20,5,.55)', 'stroke-width': 1 }, rat);
  for (let i = 0; i < 28; i++) {
    const [x1, y1] = P(24, i * (360 / 28), BRL.x, BRL.y);
    const [x2, y2] = P(80, i * (360 / 28) + 8, BRL.x, BRL.y);
    el('line', { x1, y1, x2, y2, stroke: 'rgba(60,40,8,.28)', 'stroke-width': 1 }, rat);
  }
  el('rect', { x: BRL.x - 9, y: BRL.y - 9, width: 18, height: 18, transform: `rotate(45 ${BRL.x} ${BRL.y})`, fill: 'url(#gRhod)', stroke: '#2A2D33', 'stroke-width': .8 }, rat);
  screwHead(rat, BRL.x, BRL.y, 9.5, 15);
  // click (pawl) + click screw
  el('path', { d: `M${BRL.x + 92} ${BRL.y + 36} q 22 9 26 29 l -11 4 q -7 -19 -19 -24 Z`, fill: 'url(#gRhod)', stroke: '#26282D', 'stroke-width': .8 }, g);
  screwHead(g, BRL.x + 105, BRL.y + 64, 5.4, 70);
}

/* ================= TRAIN LAYER ================= */
let ghostNote;
{
  const g = layers.train.g;
  // ghost three-quarter plate — drafting convention: shown transparent
  const mask = el('mask', { id: 'mGhost' }, defs);
  el('rect', { x: 0, y: 0, width: 1000, height: 1000, fill: '#fff' }, mask);
  el('circle', { cx: BAL.x, cy: BAL.y, r: 186, fill: '#000' }, mask);
  el('circle', { cx: PAL.x, cy: PAL.y + 40, r: 148, fill: '#000' }, mask);
  const ghost = el('g', { mask: 'url(#mGhost)' }, g);
  el('circle', { cx: MC.x, cy: MC.y, r: 368, fill: 'rgba(255,255,255,.028)' }, ghost);
  el('circle', { cx: MC.x, cy: MC.y, r: 368, fill: 'url(#ribbing)' }, ghost);
  el('circle', { cx: MC.x, cy: MC.y, r: 368, fill: 'none', stroke: 'rgba(255,255,255,.17)', 'stroke-width': 1.2, 'stroke-dasharray': '6 5' }, ghost);
  // note hides under the chapter ring when assembled; disassembly reveals it
  ghostNote = el('text', { x: 500, y: 869, class: 'svg-mono gnote', 'font-size': 16, 'letter-spacing': 1.5, 'text-anchor': 'middle', fill: 'rgba(255,255,255,.32)' }, g);
  ghostNote.textContent = '¾ PLATE — SHOWN TRANSPARENT';
}
const wCenter = wheel(layers.train.g, { cx: CTR.x, cy: CTR.y, rTip: CTR.r, teeth: 64, arms: 5, pinion: 15 });
const wThird  = wheel(layers.train.g, { cx: THD.x, cy: THD.y, rTip: THD.r, teeth: 60, arms: 4, pinion: 13 });
const wFourth = wheel(layers.train.g, { cx: FTH.x, cy: FTH.y, rTip: FTH.r, teeth: 72, arms: 4, pinion: 11 });
for (const p of [CTR, THD, FTH]) chaton(layers.train.g, p.x, p.y, 4.2);

/* ================= ESCAPEMENT LAYER ================= */
const wEscape = wheel(layers.esc.g, { cx: ESC.x, cy: ESC.y, rTip: ESC.r, teeth: 15, arms: 4, hub: 9, rimIn: 38, pinion: 10 });
{ // club teeth override: swap gear path for club-tooth path, pale gilt finish
  const p = wEscape.rot.querySelector('path');
  p.setAttribute('d',
    clubD(40, ESC.r, 15) + sectorHoleD(14, 36, 10, 78) + sectorHoleD(14, 36, 100, 168) + sectorHoleD(14, 36, 190, 258) + sectorHoleD(14, 36, 280, 348));
  p.setAttribute('fill', 'url(#gGilt)');
}
let forkRot;
const stoneGlints = [];
{
  const g = layers.esc.g;
  // pallet fork — arbor at PAL, +x aims at escape-wheel center
  const fork = el('g', { transform: `translate(${PAL.x} ${PAL.y}) rotate(${AXIS_DEG})` }, g);
  forkRot = el('g', {}, fork);
  const steel = { fill: 'url(#gRhod)', stroke: '#26282D', 'stroke-width': .9 };
  // lever — slim tapered shaft, fork slot, two horns, guard pin
  el('path', { d: 'M 12 -3.4 L -126 -2.4 L -126 -6.8 L -142 -7.6 Q -146 -7.2 -146 -4.2 L -133 -2.6 L -133 2.6 L -146 4.2 Q -146 7.2 -142 7.6 L -126 6.8 L -126 2.4 L 12 3.4 Z', ...steel }, forkRot);
  el('line', { x1: -146, y1: 0, x2: -156, y2: 0, stroke: '#7F848C', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, forkRot);
  // anchor arms to the pallet stones
  const wc = { x: PE, y: 0 };
  for (const s of [-1, 1]) {
    const px = wc.x - (ESC.r + 2) * Math.cos(s * 38 * Math.PI / 180) * .8 - 8;
    const py = s * (ESC.r + 4) * Math.sin(38 * Math.PI / 180) * 1.35;
    // straight tapered arm from the arbor to the stone seat
    el('path', { d: `M 2 ${s * -4} L ${px - 6} ${py - s * 7} L ${px + 5} ${py + s * 1} L 5 ${s * 4.6} Z`, ...steel }, forkRot);
    // ruby pallet stone, long axis radial to the wheel
    const ang = Math.atan2(py - wc.y, px - wc.x) * 180 / Math.PI;
    el('rect', { x: px - 3.2, y: py - 8.5, width: 6.4, height: 17, rx: 1.2, transform: `rotate(${ang + 90} ${px} ${py})`, fill: 'url(#gRuby)', stroke: '#3F0A13', 'stroke-width': .7 }, forkRot);
    // lock glint — the stone catching the tooth flashes in the lamplight at each drop
    stoneGlints.push(el('rect', { x: px - 1.6, y: py - 6.5, width: 3.2, height: 13, rx: 1, transform: `rotate(${ang + 90} ${px} ${py})`, fill: '#FFD9DE', opacity: 0 }, forkRot));
  }
  el('circle', { cx: 0, cy: 0, r: 6, ...steel }, forkRot);
  el('circle', { cx: 0, cy: 0, r: 2.4, fill: 'url(#gRuby)' }, forkRot);
  // pallet bridge above the fork
  const brg = el('g', {}, g);
  el('rect', { x: PAL.x - 33, y: PAL.y - 11, width: 66, height: 22, rx: 10, transform: `rotate(${AXIS_DEG + 90} ${PAL.x} ${PAL.y})`, fill: 'url(#gRhod)', opacity: .88, stroke: '#26282D', 'stroke-width': .9 }, brg);
  chaton(brg, PAL.x, PAL.y, 3.6);
  const [b1x, b1y] = P(27, AXIS_DEG + 90, PAL.x, PAL.y);
  const [b2x, b2y] = P(27, AXIS_DEG - 90, PAL.x, PAL.y);
  screwHead(brg, b1x, b1y, 4.6, 120); screwHead(brg, b2x, b2y, 4.6, 10);
}
/* balance assembly */
let balRot, springPath;
{
  const g = layers.esc.g;
  // hairspring (drawn under the rim so the coil reads through the cut-outs)
  springPath = el('path', { fill: 'none', stroke: '#5B84C8', 'stroke-width': 1.3, opacity: .95 }, g);
  balRot = el('g', {}, g);
  // rim with two arms — full disc minus two annular cut-outs
  const rO = BAL.r, rI = BAL.r - 17;
  let d = `M${rO} 0A${rO} ${rO} 0 1 1 ${-rO} 0A${rO} ${rO} 0 1 1 ${rO} 0Z`
        + sectorHoleD(20, rI, 14, 166) + sectorHoleD(20, rI, 194, 346);
  el('path', { d, transform: `translate(${BAL.x} ${BAL.y})`, fill: 'url(#gBrassDeep)', 'fill-rule': 'evenodd', stroke: 'rgba(30,20,5,.55)', 'stroke-width': 1 }, balRot);
  // timing screws on the rim
  for (let i = 0; i < 14; i++) {
    const a = i * (360 / 14) + 7;
    const [x, y] = P(BAL.r - 8.5, a, BAL.x, BAL.y);
    el('circle', { cx: x, cy: y, r: 4.4, fill: i === 3 ? '#E8CE8B' : 'url(#gBrassDeep)', stroke: '#4A3512', 'stroke-width': .7 }, balRot);
  }
  // roller table + impulse ruby
  el('circle', { cx: BAL.x, cy: BAL.y, r: 15, fill: 'url(#gRhod)', stroke: '#33363C', 'stroke-width': .8 }, balRot);
  const pinBase = Math.atan2(PAL.y - BAL.y, PAL.x - BAL.x) * 180 / Math.PI;
  const [ipx, ipy] = P(23, pinBase, BAL.x, BAL.y);
  el('circle', { cx: ipx, cy: ipy, r: 3.5, fill: 'url(#gRuby)', stroke: '#3F0A13', 'stroke-width': .6 }, balRot);
  el('circle', { cx: BAL.x, cy: BAL.y, r: 6.2, fill: 'url(#gSteel)', stroke: '#0B0F1C', 'stroke-width': .7 }, balRot);
  // balance cock — from the left plate edge to the boss; machined double border
  const cock = el('g', {}, g);
  el('path', { d: `M 150 424 C 128 462 128 496 150 532 L 232 514 C 258 506 268 498 272 486 L 272 470 C 268 458 256 448 232 442 Z`, fill: 'url(#gRhod)', stroke: '#26282D', 'stroke-width': 1 }, cock);
  // polished anglage along the upper edge — the bevel catches the bench lamp
  el('path', { d: 'M 150 424 L 232 442 C 251 447 261 454 267 462', fill: 'none', stroke: 'rgba(216,226,240,.38)', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, cock);
  el('path', { d: `M 157 434 C 139 464 139 492 157 522 L 228 506 C 250 499 258 493 262 484 L 262 472 C 258 463 248 456 228 450 Z`, fill: 'none', stroke: 'rgba(30,33,38,.5)', 'stroke-width': .8 }, cock);
  // fine parallel engraving arcs, following the foot
  for (let i = 0; i < 4; i++) {
    el('path', { d: `M ${164 + i * 9} ${443 - i * 2} C ${150 + i * 9} ${466} ${150 + i * 9} ${490} ${164 + i * 9} ${513 + i * 2}`, fill: 'none', stroke: 'rgba(30,33,38,.52)', 'stroke-width': .8 }, cock);
  }
  el('circle', { cx: BAL.x, cy: BAL.y, r: 22, fill: 'url(#gRhod)', stroke: '#26282D', 'stroke-width': 1 }, cock);
  chaton(cock, BAL.x, BAL.y, 5.2);
  screwHead(cock, 163, 478, 7, 40);
  // swan-neck fine adjustment
  el('path', { d: `M ${BAL.x + 14} ${BAL.y - 36} c -18 -10 -34 0 -30 16 c 3 12 19 13 25 4`, fill: 'none', stroke: 'url(#gSteel)', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, cock);
  el('line', { x1: BAL.x - 18, y1: BAL.y - 24, x2: BAL.x + 26, y2: BAL.y - 31, stroke: '#767B83', 'stroke-width': 2, 'stroke-linecap': 'round' }, cock);
  screwHead(cock, BAL.x - 22, BAL.y - 42, 4.2, 100);
  // stud pin where the spring is pinned
  const [stx, sty] = P(SPR.r0 + SPR.k * SPR.turns * 2 * Math.PI, SPR.stud * 180 / Math.PI, BAL.x, BAL.y);
  el('circle', { cx: stx, cy: sty, r: 4, fill: 'url(#gRhod)', stroke: '#33363C', 'stroke-width': .8 }, cock);
}
function springD(thetaDeg) {
  const N = 130, turns = SPR.turns, aMax = turns * 2 * Math.PI;
  const breathe = REDUCED ? 0 : -.085 * (thetaDeg / AMP);
  const rot = SPR.stud - aMax + (REDUCED ? 0 : thetaDeg * Math.PI / 180 * .06);
  let d = '';
  for (let i = 0; i <= N; i++) {
    const a = i / N * aMax;
    const wob = 1 + breathe * (1 - a / aMax);
    const r = (SPR.r0 + SPR.k * a) * wob;
    const x = BAL.x + r * Math.cos(a + rot), y = BAL.y + r * Math.sin(a + rot);
    d += (i ? 'L' : 'M') + f2(x) + ' ' + f2(y);
  }
  return d;
}

/* ================= DIAL LAYER ================= */
let hourHand, minHand, secHand;
{
  const g = layers.dial.g;
  // chapter ring
  el('path', { d: ringD(390, 353), transform: `translate(${MC.x} ${MC.y})`, fill: '#191B1F', 'fill-rule': 'evenodd', stroke: 'rgba(255,255,255,.10)', 'stroke-width': 1 }, g);
  for (let i = 0; i < 60; i++) {
    if (i % 15 === 0) continue;          // numeral positions
    const a = i * 6 - 90, hour = i % 5 === 0;
    const [x1, y1] = P(hour ? 384 : 384, a, MC.x, MC.y);
    const [x2, y2] = P(hour ? 362 : 375, a, MC.x, MC.y);
    el('line', { x1, y1, x2, y2, stroke: hour ? '#C7CBD1' : 'rgba(199,203,209,.55)', 'stroke-width': hour ? 3 : 1.3 }, g);
  }
  const num = (t, x, y) => {
    const n = el('text', { x, y, class: 'svg-serif', 'font-size': 27, 'font-weight': 600, 'text-anchor': 'middle', fill: '#C7CBD1' }, g);
    n.textContent = t;
  };
  num('XII', 500, 138); num('III', 872, 510); num('VI', 500, 882); num('IX', 128, 510);
  // small-seconds track around the fourth wheel
  el('circle', { cx: FTH.x, cy: FTH.y, r: 58, fill: 'none', stroke: 'rgba(199,203,209,.4)', 'stroke-width': 1 }, g);
  for (let i = 0; i < 12; i++) {
    const a = i * 30 - 90;
    const [x1, y1] = P(58, a, FTH.x, FTH.y), [x2, y2] = P(51, a, FTH.x, FTH.y);
    el('line', { x1, y1, x2, y2, stroke: 'rgba(199,203,209,.5)', 'stroke-width': i % 3 === 0 ? 1.8 : 1 }, g);
  }
  // hands — blued steel, lance, with a soft cast shadow for depth
  const hourD = `M ${MC.x - 4.5} ${MC.y + 36} L ${MC.x - 8.5} ${MC.y - 80} L ${MC.x} ${MC.y - 213} L ${MC.x + 8.5} ${MC.y - 80} L ${MC.x + 4.5} ${MC.y + 36} Z`;
  const minD = `M ${MC.x - 3.2} ${MC.y + 44} L ${MC.x - 6.4} ${MC.y - 120} L ${MC.x} ${MC.y - 332} L ${MC.x + 6.4} ${MC.y - 120} L ${MC.x + 3.2} ${MC.y + 44} Z`;
  hourHand = el('g', {}, g);
  el('path', { d: hourD, fill: '#000', opacity: .3, transform: 'translate(3 5)' }, hourHand);
  el('path', { d: hourD, fill: 'url(#gSteel)', stroke: 'rgba(200,222,255,.62)', 'stroke-width': .9 }, hourHand);
  minHand = el('g', {}, g);
  el('path', { d: minD, fill: '#000', opacity: .3, transform: 'translate(3 5)' }, minHand);
  el('path', { d: minD, fill: 'url(#gSteel)', stroke: 'rgba(200,222,255,.62)', 'stroke-width': .9 }, minHand);
  el('circle', { cx: MC.x, cy: MC.y, r: 12.5, fill: 'url(#gBrassDeep)', stroke: '#4A3512', 'stroke-width': .8 }, g);
  el('circle', { cx: MC.x, cy: MC.y, r: 5, fill: 'url(#gSteel)' }, g);
  secHand = el('g', {}, g);
  el('path', { d: `M ${FTH.x - 1.7} ${FTH.y + 15} L ${FTH.x} ${FTH.y - 53} L ${FTH.x + 1.7} ${FTH.y + 15} Z`, fill: 'url(#gSteel)', stroke: 'rgba(160,190,240,.3)', 'stroke-width': .5 }, secHand);
  el('circle', { cx: FTH.x, cy: FTH.y + 8, r: 4.6, fill: 'url(#gSteel)', stroke: 'rgba(160,190,240,.3)', 'stroke-width': .5 }, secHand);
  el('circle', { cx: FTH.x, cy: FTH.y, r: 3, fill: 'url(#gBrassDeep)' }, g);
}

/* ================= EXPLODED-VIEW ANNOTATIONS ================= */
const LAYER_META = [
  { id: 'dial',   idx: -2, anchor: { x: 500, y: 500 }, r: 390, ref: 'MW-04', name: 'MOTION WORK & HANDS',     sub: '12 : 1 reduction · blued lance hands' },
  { id: 'esc',    idx: -1, anchor: { x: 352, y: 580 }, r: 208, ref: 'ES-03', name: 'SWISS-LEVER ESCAPEMENT',  sub: '15 teeth · 21,600 A/h · one rev in 5 s' },
  { id: 'train',  idx: 0,  anchor: { x: 576, y: 622 }, r: 226, ref: 'GT-02', name: 'GOING TRAIN',             sub: '64:8 · 60:8 · 72:6 — one rev a minute' },
  { id: 'barrel', idx: 1,  anchor: { x: BRL.x, y: BRL.y }, r: 136, ref: 'BR-01', name: 'BARREL & MAINSPRING', sub: '72 h reserve · one rev in 8 h' },
  { id: 'plate',  idx: 2,  anchor: { x: 500, y: 500 }, r: PLATE_R, ref: 'PL-00', name: 'MAINPLATE',           sub: 'German silver · Ø 32.60 mm' },
];
const axisLine = el('line', { stroke: 'rgba(199,203,209,.35)', 'stroke-width': 1, 'stroke-dasharray': '7 7', opacity: 0 }, annot);
for (const m of LAYER_META) {
  const g = el('g', { opacity: 0 }, annot);
  m.leader = el('line', { stroke: 'rgba(199,203,209,.4)', 'stroke-width': 1 }, g);
  m.dot = el('circle', { r: 3, fill: '#C29B4A' }, g);
  m.t1 = el('text', { class: 'svg-mono lab-line1', 'font-size': 15 }, g);
  m.tRef = el('tspan', { fill: '#C29B4A', 'font-weight': 500, 'letter-spacing': 1 }, m.t1); m.tRef.textContent = m.ref + '  ';
  m.tName = el('tspan', { fill: '#C7CBD1', 'letter-spacing': 1.5 }, m.t1); m.tName.textContent = m.name;
  m.t2 = el('text', { class: 'svg-mono lab-line2', 'font-size': 12.5, fill: '#8A8F96', 'letter-spacing': .8 }, g);
  m.t2.textContent = m.sub;
  m.grp = g;
  m.windows = { dial: [.06, .62], esc: [.14, .70], train: [.22, .78], barrel: [.30, .86], plate: [.38, .92] }[m.id];
}
// dimension rule Ø 32.60 under the exploded plate
const dimG = el('g', { opacity: 0 }, annot);
const dimL = el('line', { stroke: 'rgba(199,203,209,.4)', 'stroke-width': 1 }, dimG);
const dimT1 = el('line', { stroke: 'rgba(199,203,209,.4)', 'stroke-width': 1 }, dimG);
const dimT2 = el('line', { stroke: 'rgba(199,203,209,.4)', 'stroke-width': 1 }, dimG);
const dimTx = el('text', { class: 'svg-mono lab-dim', 'font-size': 13, fill: '#C7CBD1', 'letter-spacing': 2, 'text-anchor': 'middle' }, dimG);
dimTx.textContent = 'Ø 32.60';

/* drafting sheet furniture */
let sheetRect, tb = [], tbLive;
{
  sheetRect = el('rect', { x: 16, y: 16, width: 968, height: 968, fill: 'none', stroke: 'rgba(199,203,209,.10)', 'stroke-width': 1 }, sheet);
  for (const line of ['DRW ESC-72.100 — EXPLODED VIEW', 'SCALE 12:1 · THIRD-ANGLE PROJECTION', 'TOL ±0.01 UNLESS NOTED · MATL GERMAN SILVER']) {
    tb.push(el('text', { x: 34, y: 0, class: 'svg-mono', 'font-size': 11.5, fill: 'rgba(199,203,209,.62)', 'letter-spacing': 1.4 }, sheet));
    tb[tb.length - 1].textContent = line;
  }
  tbLive = el('text', { x: 34, y: 0, class: 'svg-mono', 'font-size': 11.5, fill: 'rgba(194,155,74,.9)', 'letter-spacing': 1.4 }, sheet);
  tbLive.textContent = 'RUNNING';
  tb.push(tbLive);
}

/* ================= LAYOUT / RESPONSIVE ================= */
let vbH = 1000, stageDY = 0, mobile = false;
let EXP = {};   // explosion constants
function layout() {
  const w = innerWidth, h = innerHeight;
  mobile = w / h < .8 || w < 700;
  vbH = clamp(Math.round(1000 * h / w), 1000, 1900);
  svg.setAttribute('viewBox', `0 0 1000 ${vbH}`);
  stageDY = (vbH - 1000) / 2;
  stage.setAttribute('transform', `translate(0 ${stageDY})`);
  sheetRect.setAttribute('height', vbH - 32);
  tb.forEach((t, i) => t.setAttribute('y', 48 + i * (mobile ? 30 : 19)));
  EXP = mobile
    ? { restS: 1, restY: 0, s: .52, panX: -78, panY: 0, A0: { x: 500, y: 505 }, step: { x: 42, y: 345 }, labelX: 985, anchorEnd: true }
    : { restS: .76, restY: 118, s: .50, panX: -132, panY: 40, A0: { x: 500, y: 500 }, step: { x: 74, y: 230 }, labelX: 738, anchorEnd: false };
  for (const m of LAYER_META) {
    m.t1.setAttribute('text-anchor', EXP.anchorEnd ? 'end' : 'start');
    m.t2.setAttribute('text-anchor', EXP.anchorEnd ? 'end' : 'start');
  }
  // layer shadows sized to content
  for (const m of LAYER_META) {
    const s = layers[m.id].shadow;
    s.setAttribute('cx', m.anchor.x); s.setAttribute('cy', m.anchor.y + m.r * .18);
    s.setAttribute('rx', m.r * 1.08); s.setAttribute('ry', m.r * .34);
  }
}
layout();
addEventListener('resize', layout);

/* ================= EXPLODE ENGINE ================= */
const scene = document.getElementById('scene');
const heroOverlay = document.getElementById('heroOverlay');
const scrollCue = document.getElementById('scrollCue');
let pTarget = 0, pShown = 0;

function readScroll() {
  const range = scene.offsetHeight - innerHeight;
  pTarget = range > 0 ? clamp(scrollY / range, 0, 1) : 0;
}
addEventListener('scroll', readScroll, { passive: true });
addEventListener('resize', readScroll);
readScroll();

function phase(p, [a, b]) { return easeIO(clamp((p - a) / (b - a), 0, 1)); }

function applyExplode() {
  pShown = REDUCED ? pTarget : lerp(pShown, pTarget, .12);
  if (Math.abs(pShown - pTarget) < .0006) pShown = pTarget;
  const p = pShown;

  const zoom = phase(p, [.05, .8]);
  const s = lerp(EXP.restS, EXP.s, zoom);
  const tx = MC.x - s * MC.x + EXP.panX * zoom;
  const ty = MC.y - s * MC.y + lerp(EXP.restY, EXP.panY, zoom);
  movement.setAttribute('transform', `translate(${f2(tx)} ${f2(ty)}) scale(${f2(s)})`);
  const M = pt => ({ x: s * pt.x + tx, y: s * pt.y + ty + stageDY });

  let firstT = null, lastT = null;
  for (const m of LAYER_META) {
    const e = phase(p, m.windows);
    const target = { x: EXP.A0.x + m.idx * EXP.step.x, y: EXP.A0.y + m.idx * EXP.step.y };
    const ox = (target.x - m.anchor.x) * e, oy = (target.y - m.anchor.y) * e;
    layers[m.id].g.setAttribute('transform', `translate(${f2(ox)} ${f2(oy)})`);
    layers[m.id].shadow.setAttribute('opacity', (.22 * e).toFixed(3));

    // label
    const a = clamp((e - .8) / .2, 0, 1);   // label lands only once its layer has nearly settled
    const anchorT = M({ x: m.anchor.x + ox, y: m.anchor.y + oy });
    if (m.idx === -2) firstT = anchorT; if (m.idx === 2) lastT = anchorT;
    m.grp.setAttribute('opacity', a.toFixed(3));
    if (a > 0) {
      const edgeX = anchorT.x + m.r * s + 12;
      const lx = EXP.labelX;
      const x1 = edgeX, x2 = EXP.anchorEnd ? lx : lx - 14;
      const drawn = x1 + (x2 - x1) * easeOutCubic(a);
      m.leader.setAttribute('x1', f2(x1)); m.leader.setAttribute('y1', f2(anchorT.y));
      m.leader.setAttribute('x2', f2(drawn)); m.leader.setAttribute('y2', f2(anchorT.y));
      m.dot.setAttribute('cx', f2(x1)); m.dot.setAttribute('cy', f2(anchorT.y));
      m.t1.setAttribute('x', lx); m.t1.setAttribute('y', f2(anchorT.y - (EXP.anchorEnd ? 14 : 2)));
      m.t2.setAttribute('x', lx); m.t2.setAttribute('y', f2(anchorT.y + (EXP.anchorEnd ? 30 : 20)));
    }
  }
  // staking axis through the exploded stack
  const axisA = clamp((p - .55) / .25, 0, 1);
  axisLine.setAttribute('opacity', (axisA * .8).toFixed(3));
  if (axisA > 0 && firstT && lastT) {
    const dx = lastT.x - firstT.x, dy = lastT.y - firstT.y, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, ext = 70 * s + 40;
    axisLine.setAttribute('x1', f2(firstT.x - ux * ext)); axisLine.setAttribute('y1', f2(firstT.y - uy * ext));
    axisLine.setAttribute('x2', f2(lastT.x + ux * ext));  axisLine.setAttribute('y2', f2(lastT.y + uy * ext));
  }
  // dimension rule under the plate
  const dA = clamp((p - .78) / .12, 0, 1);
  dimG.setAttribute('opacity', dA.toFixed(3));
  if (dA > 0 && lastT) {
    // diameter dimension drawn straight through the part — drafting convention
    const half = PLATE_R * s, y = lastT.y;
    dimL.setAttribute('x1', f2(lastT.x - half)); dimL.setAttribute('x2', f2(lastT.x + half));
    dimL.setAttribute('y1', f2(y)); dimL.setAttribute('y2', f2(y));
    for (const [t, sgn] of [[dimT1, -1], [dimT2, 1]]) {
      t.setAttribute('x1', f2(lastT.x + sgn * half)); t.setAttribute('x2', f2(lastT.x + sgn * half));
      t.setAttribute('y1', f2(y - 8)); t.setAttribute('y2', f2(y + 8));
    }
    dimTx.setAttribute('x', f2(lastT.x)); dimTx.setAttribute('y', f2(y - 10));
  }
  sheet.setAttribute('opacity', phase(p, [.45, .78]).toFixed(3));
  // hero overlay fade
  const hf = clamp(p / .07, 0, 1);
  heroOverlay.style.opacity = (1 - hf).toFixed(3);
  heroOverlay.style.transform = `translateY(${(-34 * hf).toFixed(1)}px)`;
  scrollCue.style.opacity = p > .02 ? 0 : 1;
}

/* ================= BEAT ENGINE — real time, real ratios ================= */
const clockEl = document.getElementById('clock');
const tzEl = document.getElementById('tz');
try { tzEl.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone.toUpperCase(); } catch (e) { /* no tz */ }

const anchorMs = Date.now() - performance.now();
const bootT = performance.now();
let windStart = bootT;                    // clicking the readout re-sets the watch
const WIND = REDUCED ? 0 : 2.0;           // seconds of hand-setting choreography
let lastSecShown = -1, lastBeatShown = -1;

const readoutBtn = document.getElementById('readout');
if (readoutBtn && !REDUCED) {
  readoutBtn.addEventListener('click', () => { windStart = performance.now(); });
}

function mechanics(nowP) {
  const tms = anchorMs + nowP;
  const d = new Date(tms);
  const h = d.getHours(), m = d.getMinutes(), s = d.getSeconds(), frac = d.getMilliseconds() / 1000;
  const secOfDay = h * 3600 + m * 60 + s + frac;
  const beatOfDay = Math.floor(secOfDay * 6);
  const tInBeat = secOfDay - beatOfDay / 6;            // 0 … 1/6 s

  // target hand angles (true time)
  const aHour = (h % 12) * 30 + m * .5 + s / 120;
  const aMin = m * 6 + s * .1 + frac * .1;

  const tLocal = (nowP - windStart) / 1000;
  const winding = tLocal < WIND;
  const wu = winding ? easeIO(clamp(tLocal / WIND, 0, 1)) : 1;

  // hands
  const sweepSec = (s + frac) * 6;
  if (winding) {
    rotate(hourHand, aHour * wu, MC.x, MC.y);
    rotate(minHand, aMin * wu, MC.x, MC.y);
    rotate(secHand, sweepSec * wu, FTH.x, FTH.y);
  } else {
    rotate(hourHand, aHour, MC.x, MC.y);
    rotate(minHand, aMin, MC.x, MC.y);
    // stepped small seconds: 1° per beat, 6 steps a second, with drop ease
    // fourth wheel carries the hand — both step together, clockwise.
    // step base derives from the PREVIOUS beat so the wrap never runs retrograde
    const dropU = REDUCED ? 1 : clamp((tInBeat - .022) / .06, 0, 1);
    const stepped = ((beatOfDay - 1) % 360) + easeOutBack(dropU);
    rotate(secHand, stepped, FTH.x, FTH.y);
    rotate(wFourth.rot, stepped, FTH.x, FTH.y);
    // escape pinion meshes the fourth wheel → counter-rotates, 12° per beat
    rotate(wEscape.rot, -(((beatOfDay - 1) % 30) * 12 + 12 * easeOutBack(dropU)), ESC.x, ESC.y);
  }
  if (winding) {
    rotate(wEscape.rot, -sweepSec * 12 * wu, ESC.x, ESC.y);
    rotate(wFourth.rot, sweepSec * wu, FTH.x, FTH.y);
  }

  // slow train — true ratios, continuous, alternating directions along the mesh
  const secOfHour = m * 60 + s + frac;
  rotate(wThird.rot, -secOfHour * .8 * (winding ? wu : 1), THD.x, THD.y);           // 8 rev/h
  rotate(wCenter.rot, secOfHour * .1 * (winding ? wu : 1), CTR.x, CTR.y);           // 1 rev/h
  rotate(wBarrel.rot, -(secOfDay % 28800) / 28800 * 360 * (winding ? wu : 1), BRL.x, BRL.y); // 1 rev/8h

  // balance + fork
  let theta = 0;
  if (!REDUCED && !winding) {
    const amp = 1 - Math.exp(-(tLocal - WIND) / .55);
    theta = AMP * amp * Math.sin(2 * Math.PI * 3 * secOfDay);
    const side = (beatOfDay % 2 === 0) ? -1 : 1;      // banking side per beat — opposes pin sweep
    const fu = easeOutCubic(clamp(tInBeat / .042, 0, 1));
    const forkDeg = -side * FORK + fu * (2 * side * FORK);
    forkRot.setAttribute('transform', `rotate(${f2(forkDeg)})`);
    // the locking stone catches the bench lamp at each drop — entry/exit alternate
    const glint = Math.max(0, 1 - tInBeat / .085) * .8;
    stoneGlints[beatOfDay % 2].setAttribute('opacity', glint.toFixed(3));
    stoneGlints[(beatOfDay + 1) % 2].setAttribute('opacity', 0);
  } else {
    forkRot.setAttribute('transform', 'rotate(0)');
    stoneGlints[0].setAttribute('opacity', 0);
    stoneGlints[1].setAttribute('opacity', 0);
  }
  rotate(balRot, theta, BAL.x, BAL.y);
  springPath.setAttribute('d', springD(theta));

  // readout
  if (s !== lastSecShown) {
    lastSecShown = s;
    clockEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  // live line in the drafting title block — the sheet knows the machine is running
  const beatsHere = Math.floor((nowP - bootT) * .006);
  if (beatsHere !== lastBeatShown) {
    lastBeatShown = beatsHere;
    tbLive.textContent = `RUNNING — ${beatsHere.toLocaleString('en-US')} BEATS SINCE YOU ARRIVED`;
  }
}

/* ================= MAIN LOOP ================= */
let raf = null, running = false;
function loop(nowP) {
  raf = requestAnimationFrame(loop);
  applyExplode();
  mechanics(nowP);
}
function start() { if (!running) { running = true; raf = requestAnimationFrame(loop); } }
function stop() { if (running) { running = false; cancelAnimationFrame(raf); } }

if (REDUCED) {
  // static pose + once-a-second time, positions still honor scroll
  const tick = () => { applyExplode(); mechanics(performance.now()); };
  tick();
  setInterval(tick, 1000);
  addEventListener('scroll', tick, { passive: true });
} else {
  const io = new IntersectionObserver(es => {
    for (const e of es) e.isIntersecting ? start() : stop();
  }, { threshold: 0 });
  io.observe(scene);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (scene.getBoundingClientRect().bottom > 0) start();
  });
  start();
}
})();
