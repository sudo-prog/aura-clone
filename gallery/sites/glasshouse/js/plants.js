/* ============================================================
   plants.js — the three star specimens, drawn from life.
   Each is a procedural portrait that germinates when its plate
   scrolls into view: titan arum, Victoria amazonica, ghost orchid.
   ============================================================ */

import { clamp, lerp, smooth, backOut, mixHex, fitCanvas, TAU, rng } from './botany.js';

const MONO = '500 10.5px "Spline Sans Mono", monospace';

function phase(g, a, b) { return smooth((g - a) / (b - a)); }

/* ---------------- titan arum ---------------- */
function drawArum(ctx, W, H, g, time, sway) {
  const cx = W * 0.46;
  const potTopY = H * 0.845, potBotY = H * 0.95;
  const R = rng(1889);

  /* terracotta pot */
  const ptw = W * 0.135, pbw = W * 0.10, rimW = W * 0.155, rimH = H * 0.024;
  const potGrad = ctx.createLinearGradient(cx - ptw, 0, cx + ptw, 0);
  potGrad.addColorStop(0, '#8E4520'); potGrad.addColorStop(0.42, '#C46A3B'); potGrad.addColorStop(1, '#9A4E26');
  ctx.fillStyle = potGrad;
  ctx.beginPath();
  ctx.moveTo(cx - ptw, potTopY); ctx.lineTo(cx + ptw, potTopY);
  ctx.lineTo(cx + pbw, potBotY); ctx.lineTo(cx - pbw, potBotY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#B65C33';
  ctx.beginPath();
  ctx.moveTo(cx - rimW, potTopY - rimH); ctx.lineTo(cx + rimW, potTopY - rimH);
  ctx.lineTo(cx + rimW * 0.94, potTopY); ctx.lineTo(cx - rimW * 0.94, potTopY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(32,57,43,0.16)';
  ctx.fillRect(cx - rimW, potTopY - rimH, rimW * 2, rimH * 0.3);
  /* soil */
  ctx.fillStyle = '#4A3A2C';
  ctx.beginPath(); ctx.ellipse(cx, potTopY - rimH, rimW * 0.88, rimH * 0.55, 0, 0, TAU); ctx.fill();

  const soilY = potTopY - rimH * 1.1;

  /* young shoot (early growth) */
  const gs = phase(g, 0, 0.14);
  if (gs > 0 && g < 0.4) {
    const a = 1 - phase(g, 0.2, 0.4);
    const shootH = H * 0.12 * gs;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#7FA168';
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.02, soilY);
    ctx.quadraticCurveTo(cx - W * 0.012, soilY - shootH * 0.8, cx, soilY - shootH);
    ctx.quadraticCurveTo(cx + W * 0.012, soilY - shootH * 0.8, cx + W * 0.02, soilY);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* spathe */
  const gp = phase(g, 0.10, 0.55);
  if (gp > 0) {
    const S = H * 0.42 * (0.15 + 0.85 * gp);           /* spathe height */
    const swayX = Math.sin(time * 0.8) * sway * W * 0.004;
    const rimY = soilY - S;
    /* silhouette: peduncle → swelling body → waist → trumpet flare */
    const open = 0.35 + 0.65 * gp;
    const halfW = t => {
      const bulge = 0.115 * Math.pow(Math.sin(Math.PI * Math.min(1, t / 0.72)), 1.15);
      const flare = 0.10 * Math.pow(smooth((t - 0.68) / 0.32), 1.4);
      return W * (0.026 + (bulge + flare) * open);
    };

    const steps = 26;
    const leftPts = [], rightPts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const hw = halfW(t);
      const y = soilY - S * t;
      const sx = swayX * t * t;
      leftPts.push([cx - hw + sx, y]);
      rightPts.push([cx + hw + sx, y]);
    }
    /* ruffled rim: scalloped closure across the top */
    const rimPts = [];
    const ruffle = W * 0.011 * gp;
    for (let i = 0; i <= 30; i++) {
      const u = i / 30;
      const x = lerp(leftPts[steps][0], rightPts[steps][0], u);
      const y = rimY - Math.abs(Math.sin(u * Math.PI * 5.5)) * ruffle - Math.sin(u * Math.PI) * W * 0.012
        + swayX;
      rimPts.push([x, y]);
    }

    const bodyGrad = ctx.createLinearGradient(0, soilY, 0, rimY);
    bodyGrad.addColorStop(0, '#7E9A62'); bodyGrad.addColorStop(0.7, '#A9BE7F'); bodyGrad.addColorStop(1, '#C2CE96');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(leftPts[0][0], leftPts[0][1]);
    for (const p of leftPts) ctx.lineTo(p[0], p[1]);
    for (const p of rimPts) ctx.lineTo(p[0], p[1]);
    for (let i = steps; i >= 0; i--) ctx.lineTo(rightPts[i][0], rightPts[i][1]);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(47,81,56,0.5)'; ctx.lineWidth = 1.1; ctx.stroke();

    /* vertical flutes */
    ctx.strokeStyle = 'rgba(47,81,56,0.22)'; ctx.lineWidth = 1;
    for (let f = -3; f <= 3; f++) {
      if (f === 0) continue;
      ctx.beginPath();
      for (let i = 2; i <= steps - 1; i++) {
        const t = i / steps;
        const hw = halfW(t) * (f / 4);
        const x = cx + hw + swayX * t * t;
        const y = soilY - S * t;
        i === 2 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    /* speckles */
    ctx.fillStyle = 'rgba(122,47,66,0.18)';
    for (let sp = 0; sp < 26; sp++) {
      const t = 0.12 + R() * 0.68, u = (R() - 0.5) * 1.5;
      const x = cx + halfW(t) * u * 0.8 + swayX * t * t, y = soilY - S * t;
      ctx.beginPath(); ctx.arc(x, y, 0.8 + R() * 1.1, 0, TAU); ctx.fill();
    }

    /* maroon throat */
    const gt = phase(g, 0.38, 0.55);
    if (gt > 0) {
      const thGrad = ctx.createLinearGradient(0, rimY, 0, rimY + S * 0.3);
      thGrad.addColorStop(0, '#7A2F42'); thGrad.addColorStop(1, '#4A1A28');
      ctx.globalAlpha = gt;
      ctx.fillStyle = thGrad;
      ctx.beginPath();
      ctx.ellipse(cx + swayX, rimY + S * 0.09, halfW(0.93) * 0.82, S * 0.14, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    /* spadix */
    const gsp = phase(g, 0.28, 0.74);
    if (gsp > 0) {
      const spH = H * 0.375 * gsp;
      const spW = W * 0.030;
      const baseY = rimY + S * 0.08;
      const tipSway = Math.sin(time * 0.8 + 0.6) * sway * W * 0.006;
      const spGrad = ctx.createLinearGradient(cx - spW, 0, cx + spW, 0);
      spGrad.addColorStop(0, '#CBB273'); spGrad.addColorStop(0.45, '#EADFAC'); spGrad.addColorStop(1, '#C9AC6C');
      ctx.fillStyle = spGrad;
      ctx.beginPath();
      ctx.moveTo(cx - spW + swayX, baseY);
      ctx.bezierCurveTo(cx - spW * 0.92 + swayX, baseY - spH * 0.5,
        cx - spW * 0.55 + tipSway + swayX, baseY - spH * 0.94,
        cx + tipSway + swayX, baseY - spH);
      ctx.bezierCurveTo(cx + spW * 0.55 + tipSway + swayX, baseY - spH * 0.94,
        cx + spW * 0.92 + swayX, baseY - spH * 0.5,
        cx + spW + swayX, baseY);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(122,94,40,0.35)'; ctx.lineWidth = 0.9; ctx.stroke();
    }

    /* front lip of the rim */
    ctx.fillStyle = '#B7C98D';
    ctx.beginPath();
    ctx.moveTo(leftPts[steps][0], leftPts[steps][1]);
    ctx.quadraticCurveTo(cx + swayX, rimY + S * 0.20, rightPts[steps][0], rightPts[steps][1]);
    ctx.quadraticCurveTo(cx + swayX, rimY + S * 0.30, leftPts[steps][0], leftPts[steps][1]);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(47,81,56,0.45)'; ctx.lineWidth = 1; ctx.stroke();
  }

  /* measurement annotation */
  const ga = phase(g, 0.82, 0.96);
  if (ga > 0) {
    const spTop = soilY - H * 0.42 - H * 0.375 + H * 0.42 * 0.08;
    const ax = cx + W * 0.335;
    ctx.globalAlpha = ga;
    ctx.strokeStyle = 'rgba(67,88,74,0.85)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(ax, soilY); ctx.lineTo(ax, spTop); ctx.stroke();
    ctx.setLineDash([]);
    for (const yy of [soilY, spTop]) {
      ctx.beginPath(); ctx.moveTo(ax - 5, yy); ctx.lineTo(ax + 5, yy); ctx.stroke();
    }
    ctx.fillStyle = '#43584A';
    ctx.font = MONO;
    ctx.save();
    ctx.translate(ax + 14, (soilY + spTop) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('2.67 M — THIS MORNING', 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

/* ---------------- victoria amazonica ---------------- */
function drawVictoria(ctx, W, H, g, time, sway) {
  const pads = [
    { cx: W * 0.44, cy: H * 0.50, R: W * 0.295, a: 0.0, b: 0.68, ribs: 26 },
    { cx: W * 0.80, cy: H * 0.76, R: W * 0.155, a: 0.30, b: 0.85, ribs: 18 },
    { cx: W * 0.14, cy: H * 0.82, R: W * 0.105, a: 0.45, b: 0.95, ribs: 14 },
  ];

  /* idle water rings */
  for (const p of pads) {
    const gp = phase(g, p.a, p.b);
    if (gp <= 0) continue;
    for (let i = 0; i < 3; i++) {
      const rr = ((time * 9 + i * 33) % 95) + p.R * gp;
      const alpha = 0.10 * (1 - ((time * 9 + i * 33) % 95) / 95) * gp;
      ctx.strokeStyle = `rgba(252,253,249,${alpha.toFixed(3)})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.ellipse(p.cx, p.cy, rr, rr * 0.92, 0, 0, TAU); ctx.stroke();
    }
  }

  for (const p of pads) {
    const gp = phase(g, p.a, p.b);
    if (gp <= 0.01) continue;
    const r = p.R * (1 - Math.pow(1 - gp, 3));
    const wob = 1 + Math.sin(time * 0.7 + p.cx) * sway * 0.006;

    /* pad body */
    const grad = ctx.createRadialGradient(p.cx - r * 0.22, p.cy - r * 0.24, r * 0.1, p.cx, p.cy, r);
    grad.addColorStop(0, '#94BA70'); grad.addColorStop(0.6, '#7BA560'); grad.addColorStop(1, '#628F52');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(p.cx, p.cy, r * wob, r * 0.94 * wob, 0, 0, TAU); ctx.fill();

    /* radial ribs, slightly spiral */
    ctx.strokeStyle = 'rgba(47,81,56,0.26)';
    ctx.lineWidth = Math.max(0.7, r * 0.008);
    for (let i = 0; i < p.ribs; i++) {
      const a = (i / p.ribs) * TAU + 0.15;
      const ex = p.cx + Math.cos(a) * r * 0.965, ey = p.cy + Math.sin(a) * r * 0.905;
      const mx = p.cx + Math.cos(a + 0.09) * r * 0.5, my = p.cy + Math.sin(a + 0.09) * r * 0.47;
      ctx.beginPath(); ctx.moveTo(p.cx, p.cy); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    }
    /* concentric cross-ribs */
    ctx.strokeStyle = 'rgba(47,81,56,0.12)';
    ctx.lineWidth = Math.max(0.6, r * 0.006);
    for (const cr of [0.3, 0.52, 0.72, 0.88]) {
      ctx.beginPath(); ctx.ellipse(p.cx, p.cy, r * cr, r * cr * 0.94, 0, 0, TAU); ctx.stroke();
    }

    /* upturned rim with the two drainage notches */
    const rimGp = phase(gp, 0.55, 1);
    if (rimGp > 0) {
      ctx.strokeStyle = mixHex('#A65838', '#B75C33', 0.5);
      ctx.lineWidth = r * 0.055 * rimGp;
      const n1 = 1.85, n2 = 4.95, gap = 0.06;   /* notch angles */
      ctx.beginPath(); ctx.ellipse(p.cx, p.cy, r * 0.985, r * 0.925, 0, n1 + gap, n2 - gap); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(p.cx, p.cy, r * 0.985, r * 0.925, 0, n2 + gap, n1 - gap + TAU); ctx.stroke();
      /* rim inner shadow */
      ctx.strokeStyle = `rgba(32,57,43,${(0.22 * rimGp).toFixed(3)})`;
      ctx.lineWidth = r * 0.02;
      ctx.beginPath(); ctx.ellipse(p.cx, p.cy, r * 0.94, r * 0.885, 0, 0, TAU); ctx.stroke();
    }
  }

  /* the one-night flower */
  const gf = phase(g, 0.60, 1);
  if (gf > 0) {
    const fx = W * 0.72, fy = H * 0.335;
    const fr = W * 0.088 * backOut(gf);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(Math.sin(time * 0.5) * sway * 0.02);
    for (let whorl = 0; whorl < 2; whorl++) {
      const petals = whorl === 0 ? 11 : 8;
      const pr = whorl === 0 ? fr : fr * 0.62;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * TAU + whorl * 0.35;
        ctx.save();
        ctx.rotate(a);
        ctx.fillStyle = whorl === 0 ? 'rgba(250,250,244,0.94)' : 'rgba(253,253,248,0.98)';
        ctx.beginPath();
        ctx.ellipse(pr * 0.62, 0, pr * 0.52, pr * 0.155, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.fillStyle = '#D9C489';
    ctx.beginPath(); ctx.arc(0, 0, fr * 0.16, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* diameter annotation — engraved across the pad itself */
  const ga = phase(g, 0.86, 1);
  if (ga > 0) {
    const p = pads[0];
    ctx.globalAlpha = ga * 0.9;
    ctx.strokeStyle = 'rgba(252,253,249,0.85)'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(p.cx - p.R * 0.92, p.cy); ctx.lineTo(p.cx + p.R * 0.92, p.cy); ctx.stroke();
    ctx.setLineDash([]);
    for (const xx of [p.cx - p.R * 0.92, p.cx + p.R * 0.92]) {
      ctx.beginPath(); ctx.moveTo(xx, p.cy - 5); ctx.lineTo(xx, p.cy + 5); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(252,253,249,0.92)'; ctx.font = MONO; ctx.textAlign = 'center';
    ctx.fillText('Ø 2.8 M — BEARS 40 KG', p.cx, p.cy + p.R * 0.5);
    ctx.globalAlpha = 1;
  }
}

/* ---------------- ghost orchid ---------------- */
function drawOrchid(ctx, W, H, g, time, sway) {
  const R = rng(1902);

  /* pond-apple bark slab */
  const bx = W * 0.05, bw = W * 0.235, by = H * 0.05, bh = H * 0.90;
  const bark = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  bark.addColorStop(0, '#6D6A56'); bark.addColorStop(0.5, '#7C7864'); bark.addColorStop(1, '#615E4C');
  ctx.fillStyle = bark;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 6);
  ctx.fill();
  /* striations */
  for (let i = 0; i < 34; i++) {
    const x = bx + R() * bw;
    const y0 = by + R() * bh * 0.8, len = bh * (0.06 + R() * 0.18);
    ctx.strokeStyle = `rgba(43,38,26,${0.12 + R() * 0.16})`;
    ctx.lineWidth = 0.8 + R() * 1.3;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + (R() - 0.5) * 4, y0 + len); ctx.stroke();
  }
  /* lichen */
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `rgba(198,210,188,${0.10 + R() * 0.14})`;
    ctx.beginPath();
    ctx.arc(bx + R() * bw, by + R() * bh, 2 + R() * 6, 0, TAU);
    ctx.fill();
  }

  /* aerial roots — grey-green, tram-lined, photosynthetic */
  const hold = { x: W * 0.19, y: H * 0.38 };
  const roots = [];
  for (let i = 0; i < 8; i++) {
    const a0 = -0.9 + i * 0.42 + (R() - 0.5) * 0.3;
    const len = H * (0.30 + R() * 0.34);
    const pts = [];
    let x = hold.x, y = hold.y, a = a0;
    const segs = 28;
    for (let s = 0; s <= segs; s++) {
      pts.push([x, y]);
      a += (R() - 0.5) * 0.30 + (i < 3 ? -0.005 : 0.03);
      /* roots prefer down and along the bark; two wander off it */
      a = lerp(a, i % 3 === 2 ? Math.PI * 0.22 : Math.PI * 0.5, 0.055);
      x += Math.cos(a) * (len / segs);
      y += Math.sin(a) * (len / segs);
    }
    roots.push({ pts, t0: 0.02 + i * 0.032, t1: 0.24 + i * 0.032, w: 3.4 + R() * 1.6 });
  }
  for (const rt of roots) {
    const gr = phase(g, rt.t0, rt.t1);
    if (gr <= 0.02) continue;
    const upto = Math.max(2, Math.floor(rt.pts.length * gr));
    /* soft contact shadow on the bark */
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(38,35,24,0.25)'; ctx.lineWidth = rt.w + 1.6;
    ctx.beginPath();
    ctx.moveTo(rt.pts[0][0] + 1, rt.pts[0][1] + 1.6);
    for (let s = 1; s < upto; s++) ctx.lineTo(rt.pts[s][0] + 1, rt.pts[s][1] + 1.6);
    ctx.stroke();
    /* body */
    ctx.strokeStyle = '#A9B69C'; ctx.lineWidth = rt.w;
    ctx.beginPath();
    ctx.moveTo(rt.pts[0][0], rt.pts[0][1]);
    for (let s = 1; s < upto; s++) ctx.lineTo(rt.pts[s][0], rt.pts[s][1]);
    ctx.stroke();
    /* tram line */
    ctx.strokeStyle = 'rgba(228,236,216,0.85)'; ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(rt.pts[0][0], rt.pts[0][1] - 0.7);
    for (let s = 1; s < upto; s++) ctx.lineTo(rt.pts[s][0], rt.pts[s][1] - 0.7);
    ctx.stroke();
    /* green growing tip */
    if (gr < 1 && upto > 2) {
      ctx.strokeStyle = '#8FB573'; ctx.lineWidth = rt.w;
      ctx.beginPath();
      ctx.moveTo(rt.pts[upto - 2][0], rt.pts[upto - 2][1]);
      ctx.lineTo(rt.pts[upto - 1][0], rt.pts[upto - 1][1]);
      ctx.stroke();
    }
  }

  /* flower stem arcs out into the air */
  const gst = phase(g, 0.30, 0.48);
  const fx = W * 0.645, fy = H * 0.30;
  if (gst > 0) {
    ctx.strokeStyle = '#7F9471'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(hold.x + 4, hold.y - 4);
    const t = gst;
    /* draw partial bezier by subdividing */
    const p0 = [hold.x + 4, hold.y - 4], p1 = [W * 0.42, H * 0.16], p2 = [W * 0.56, H * 0.22], p3 = [fx, fy];
    for (let s = 1; s <= 24; s++) {
      const u = (s / 24) * t;
      const mt = 1 - u;
      const bx2 = mt ** 3 * p0[0] + 3 * mt * mt * u * p1[0] + 3 * mt * u * u * p2[0] + u ** 3 * p3[0];
      const by2 = mt ** 3 * p0[1] + 3 * mt * mt * u * p1[1] + 3 * mt * u * u * p2[1] + u ** 3 * p3[1];
      ctx.lineTo(bx2, by2);
    }
    ctx.stroke();
  }

  /* the ghost — hovering white flower with trailing tails */
  const gf = phase(g, 0.45, 1);
  if (gf > 0) {
    const s = W * 0.145 * backOut(Math.min(1, gf * 1.15));
    /* soft shadow halo so the white reads against celadon */
    const halo = ctx.createRadialGradient(fx, fy + s * 0.5, s * 0.1, fx, fy + s * 0.5, s * 2.4);
    halo.addColorStop(0, 'rgba(32,57,43,0.16)'); halo.addColorStop(1, 'rgba(32,57,43,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(fx, fy + s * 0.5, s * 2.6, 0, TAU); ctx.fill();

    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(Math.sin(time * 0.6) * 0.03 * (1 + sway));

    /* narrow greenish sepals */
    ctx.fillStyle = 'rgba(226,234,214,0.92)';
    for (const a of [-Math.PI / 2, -Math.PI / 2 + 2.4, -Math.PI / 2 - 2.4]) {
      ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(s * 0.62, 0, s * 0.58, s * 0.085, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    /* two petals */
    ctx.fillStyle = 'rgba(240,245,232,0.95)';
    for (const a of [-Math.PI / 2 + 1.1, -Math.PI / 2 - 1.1]) {
      ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(s * 0.5, 0, s * 0.5, s * 0.13, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }

    /* the lip: two rounded lobes — the frog's legs spring from here */
    ctx.fillStyle = 'rgba(252,253,249,0.97)';
    ctx.beginPath(); ctx.arc(-s * 0.16, s * 0.30, s * 0.21, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.16, s * 0.30, s * 0.21, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, s * 0.16, s * 0.24, s * 0.20, 0, 0, TAU); ctx.fill();

    /* trailing twisted tails */
    const tailG = phase(gf, 0.35, 1);
    if (tailG > 0) {
      ctx.strokeStyle = 'rgba(250,252,246,0.95)';
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const tl = s * 2.9 * tailG;
        const sw = Math.sin(time * 0.9 + side) * 0.12 * (0.4 + sway);
        ctx.beginPath();
        const steps2 = 22;
        for (let i2 = 0; i2 <= steps2; i2++) {
          const u = i2 / steps2;
          const xx = side * (s * 0.22 + Math.sin(u * Math.PI * 1.6 + sw) * s * 0.42 * u);
          const yy = s * 0.42 + tl * u + Math.sin(u * 9 + time * 0.9) * s * 0.02;
          ctx.lineWidth = Math.max(0.8, s * 0.085 * (1 - u * 0.75));
          i2 === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
        }
        ctx.stroke();
        /* curled tip */
        const tipY = s * 0.42 + tl;
        const tipX = side * (s * 0.22 + Math.sin(Math.PI * 1.6 + sw) * s * 0.42);
        ctx.lineWidth = Math.max(0.6, s * 0.03);
        ctx.beginPath();
        let ca = Math.PI / 2, cx2 = tipX, cy2 = tipY;
        ctx.moveTo(cx2, cy2);
        for (let q = 0; q < 8; q++) {
          ca += 0.62 * side; const L = s * 0.05 * (1 - q / 9);
          cx2 += Math.cos(ca) * L; cy2 += Math.sin(ca) * L;
          ctx.lineTo(cx2, cy2);
        }
        ctx.stroke();
      }
    }
    /* column dot */
    ctx.fillStyle = '#C9CF8E';
    ctx.beginPath(); ctx.arc(0, s * 0.02, s * 0.07, 0, TAU); ctx.fill();
    ctx.restore();
  }

}

/* ---------------- specimen controller ---------------- */
const DRAWERS = { arum: drawArum, victoria: drawVictoria, orchid: drawOrchid };
const GROW_MS = { arum: 2600, victoria: 2600, orchid: 3000 };

export class Specimen {
  constructor(canvas, kind, reduced) {
    this.canvas = canvas;
    this.kind = kind;
    this.reduced = reduced;
    this.g = reduced ? 1 : 0;
    this.started = false;
    this.t0 = 0;
    this.sway = 0;
    this.swayTarget = 0;
    this.inView = false;
    this.resize();

    const plate = canvas.closest('.plate-art');
    if (plate && !reduced) {
      plate.addEventListener('pointerenter', () => { this.swayTarget = 1; });
      plate.addEventListener('pointerleave', () => { this.swayTarget = 0; });
    }
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.W = Math.max(10, r.width);
    this.H = Math.max(10, r.height || r.width * 1.2);
    this.ctx = fitCanvas(this.canvas, this.W, this.H);
    this.render(performance.now());
  }
  start(now) {
    if (this.started) return;
    this.started = true;
    this.t0 = now;
  }
  /* returns true while it still wants frames */
  render(now) {
    const t = now / 1000;
    if (this.started && !this.reduced) {
      this.g = clamp((now - this.t0) / GROW_MS[this.kind], 0, 1);
    }
    this.sway += (this.swayTarget - this.sway) * 0.04;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    DRAWERS[this.kind](ctx, this.W, this.H, this.reduced ? 1 : this.g, t, this.sway + 0.25);
    return !this.reduced && (this.g < 1 || this.inView);
  }
}
