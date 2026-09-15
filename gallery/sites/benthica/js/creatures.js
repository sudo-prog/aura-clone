// BENTHICA — creatures.js
// Canvas-drawn inhabitants of the water column. Each creature lives at a true
// depth and transits the viewport as VELA sinks past it.
// draw(ctx, e) where e = { t, u, a, W, H, reduced }
//   u : (currentDepth - creature.depth) / span  → -1 below us … +1 above us
//   a : edge-fade alpha 0..1

const TAU = Math.PI * 2;

function transitY(e, gain = 0.78) {
  // creature deeper than us (u<0) sits low in frame; it rises as we descend
  return e.H * (0.5 - e.u * gain);
}

/* ---------------------------------------------------------------- */
/* SIPHONOPHORE — 612 m. A colony longer than VELA, pulse of light   */
/* running the chain when disturbed.                                 */
/* ---------------------------------------------------------------- */

const siphonophore = {
  name: 'siphonophore',
  depth: 612,
  span: 300,
  draw(ctx, e) {
    const { t, W, H, a } = e;
    const yc = transitY(e, 0.72);
    const N = 64;
    const drift = Math.sin(t * 0.045) * 0.05;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const x = W * (-0.12 + drift) + s * W * 1.24;
      const y = yc + Math.sin(s * 5.6 + t * 0.38) * H * 0.05 + (s - 0.5) * H * 0.24;
      pts.push([x, y, s]);
    }
    ctx.save();
    ctx.globalAlpha = a;

    // stem
    ctx.strokeStyle = 'rgba(185,232,238,0.13)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();

    // two bioluminescent pulses chasing along the chain
    const pu = ((t * 0.13) % 1.6) - 0.3;
    const pu2 = pu - 0.5;

    for (let i = 0; i <= N; i += 2) {
      const [x, y, s] = pts[i];
      const [x2, y2] = pts[Math.min(i + 2, N)];
      const rot = Math.atan2(y2 - y, x2 - x);
      const r = 3.4 + 2.4 * (0.5 + 0.5 * Math.sin(s * 23.7 + 1.7));

      // nectophore bell
      ctx.fillStyle = 'rgba(190,235,240,0.12)';
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.6, r, rot, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,240,245,0.08)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // trailing tentilla
      if (i % 4 === 0) {
        ctx.strokeStyle = 'rgba(170,220,230,0.065)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(x, y + r * 0.7);
        ctx.quadraticCurveTo(
          x - 5, y + 16,
          x + Math.sin(t * 0.7 + i * 0.8) * 5, y + 30 + (i % 8) * 2
        );
        ctx.stroke();
      }

      // pulse glow
      const g =
        Math.exp(-Math.pow((s - pu) / 0.055, 2)) +
        0.55 * Math.exp(-Math.pow((s - pu2) / 0.05, 2));
      if (g > 0.02) {
        const rg = ctx.createRadialGradient(x, y, 0, x, y, 15);
        rg.addColorStop(0, `rgba(120,245,215,${0.5 * g})`);
        rg.addColorStop(1, 'rgba(120,245,215,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  },
};

/* ---------------------------------------------------------------- */
/* DEEP SCATTERING LAYER — 800 m. Ten billion small bodies that read */
/* as a false seafloor on sonar. Seen from the viewport: a stratum   */
/* of dim slivers, each carrying one point of cold light.            */
/* ---------------------------------------------------------------- */

const DSL_N = 84;
const dslBodies = [];
for (let i = 0; i < DSL_N; i++) {
  dslBodies.push({
    u: Math.random(),
    v: Math.random() - 0.5,
    ph: Math.random() * TAU,
    sp: 0.05 + Math.random() * 0.11,
    len: 2.6 + Math.random() * 4.8,
    tw: 1.4 + Math.random() * 2.8,
    glint: i % 6 === 0,
  });
}

const scatteringLayer = {
  name: 'scattering-layer',
  depth: 800,
  span: 330,
  draw(ctx, e) {
    const { t, W, H, a } = e;
    const yc = transitY(e, 0.8);
    const thick = H * 0.15;
    ctx.save();

    // the haze of the layer itself — sonar's false floor
    const lg = ctx.createLinearGradient(0, yc - thick * 0.8, 0, yc + thick * 0.8);
    lg.addColorStop(0, 'rgba(96,136,150,0)');
    lg.addColorStop(0.5, `rgba(96,136,150,${0.055 * a})`);
    lg.addColorStop(1, 'rgba(96,136,150,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, yc - thick * 0.8, W, thick * 1.6);

    for (const b of dslBodies) {
      const drift = (b.u + t * 0.004 * (0.4 + b.sp) + Math.sin(t * b.sp + b.ph) * 0.015) % 1;
      const x = ((drift + 1) % 1) * W;
      const y = yc + b.v * thick + Math.sin(t * b.sp * 3.1 + b.ph * 2) * 4;
      const dir = Math.cos(t * b.sp + b.ph) >= 0 ? 1 : -1;
      const bodyA = (0.06 + 0.1 * Math.abs(b.v) * 2) * a;
      ctx.strokeStyle = `rgba(168,205,215,${bodyA})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x - b.len * dir, y + 0.4);
      ctx.lineTo(x + b.len * dir, y - 0.4);
      ctx.stroke();
      if (b.glint) {
        const twk = Math.pow(Math.max(0, Math.sin(t * b.tw + b.ph * 3)), 10);
        if (twk > 0.03) {
          const rg = ctx.createRadialGradient(x, y, 0, x, y, 4.5);
          rg.addColorStop(0, `rgba(140,250,225,${0.5 * twk * a})`);
          rg.addColorStop(1, 'rgba(140,250,225,0)');
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(x, y, 4.5, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  },
};

/* ---------------------------------------------------------------- */
/* LANTERNFISH — 1,210 m. A school rewriting its constellations.     */
/* ---------------------------------------------------------------- */

const FISH_N = 11;
const fishes = [];
for (let i = 0; i < FISH_N; i++) {
  fishes.push({
    ph: Math.random() * TAU,
    sp: 0.24 + Math.random() * 0.22,
    rx: 0.09 + Math.random() * 0.16,
    ry: 0.05 + Math.random() * 0.11,
    blinkw: 2.2 + Math.random() * 3.4,
    size: 0.8 + Math.random() * 0.5,
  });
}

function drawFish(ctx, f, x, y, dir, t, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * f.size, f.size);

  // body silhouette — slightly lighter than the midnight water
  ctx.fillStyle = `rgba(88,116,128,${0.30 * a})`;
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.quadraticCurveTo(-6, -5.4, 4, -4.2);
  ctx.quadraticCurveTo(11, -2.6, 14, 0);
  ctx.quadraticCurveTo(11, 2.6, 4, 4.4);
  ctx.quadraticCurveTo(-6, 5.6, -15, 0);
  ctx.fill();
  // tail fork
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-20, -4.5);
  ctx.lineTo(-17.5, 0);
  ctx.lineTo(-20, 4.5);
  ctx.closePath();
  ctx.fill();
  // eye
  ctx.fillStyle = `rgba(190,225,235,${0.5 * a})`;
  ctx.beginPath();
  ctx.arc(9, -1, 1.4, 0, TAU);
  ctx.fill();

  // ventral photophores — sharp blinks
  const dots = [-11, -8, -5, -2, 1, 4, 7, 10];
  for (let d = 0; d < dots.length; d++) {
    const b = Math.pow(
      Math.max(0, Math.sin(t * f.blinkw + d * 1.71 + f.ph * 2.3)),
      22
    );
    const al = (0.16 + 0.84 * b) * a;
    const rr = 1.15 + b * 1.15;
    const rg = ctx.createRadialGradient(dots[d], 3.6, 0, dots[d], 3.6, rr * 3.4);
    rg.addColorStop(0, `rgba(140,250,225,${al})`);
    rg.addColorStop(1, 'rgba(140,250,225,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(dots[d], 3.6, rr * 3.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

const lanternfish = {
  name: 'lanternfish',
  depth: 1210,
  span: 260,
  draw(ctx, e) {
    const { t, W, H, a } = e;
    const yc = transitY(e, 0.7);
    const cx = W * (0.56 + 0.2 * Math.sin(t * 0.06));
    ctx.save();
    for (let i = 0; i < FISH_N; i++) {
      const f = fishes[i];
      const fx = cx + Math.sin(t * f.sp + f.ph) * W * f.rx;
      const fy = yc + Math.cos(t * f.sp * 0.83 + f.ph * 1.7) * H * f.ry;
      const vx = Math.cos(t * f.sp + f.ph); // x-velocity sign
      drawFish(ctx, f, fx, fy, vx >= 0 ? 1 : -1, t, a);
    }
    ctx.restore();
  },
};

/* ---------------------------------------------------------------- */
/* ANGLERFISH — 2,507 m. The lure arrives before the animal does.    */
/* ---------------------------------------------------------------- */

const anglerfish = {
  name: 'anglerfish',
  depth: 2507,
  span: 240,
  draw(ctx, e) {
    const { t, W, H, a } = e;
    const yc = transitY(e, 0.66);
    // holds station off the port quarter — open water right of the log column
    const cx = W * 0.71 + Math.sin(t * 0.05) * W * 0.03;
    const cy = yc;

    // lure sways on its illicium
    const lx = cx - Math.min(150, W * 0.12) + Math.sin(t * 0.55) * 26;
    const ly = cy - 26 + Math.sin(t * 0.41 + 1.2) * 15;
    const flick =
      0.66 + 0.34 * (0.5 + 0.25 * Math.sin(t * 6.1) + 0.25 * Math.sin(t * 9.7));
    const glow = a * flick;

    ctx.save();

    // body — a silhouette one shade off black, rim-lit by its own lure
    const bx = cx + Math.min(70, W * 0.06);
    const body = new Path2D();
    // rounded hunched body, big head facing the lure (left)
    body.moveTo(bx - 62, cy + 6);
    body.quadraticCurveTo(bx - 66, cy - 44, bx - 8, cy - 52);
    body.quadraticCurveTo(bx + 66, cy - 58, bx + 96, cy - 14);
    body.quadraticCurveTo(bx + 112, cy + 12, bx + 88, cy + 30);
    body.quadraticCurveTo(bx + 40, cy + 52, bx - 22, cy + 44);
    body.quadraticCurveTo(bx - 58, cy + 36, bx - 62, cy + 6);
    const grd = ctx.createRadialGradient(lx, ly, 10, lx, ly, 320);
    grd.addColorStop(0, `rgba(52,84,86,${0.34 * glow})`);
    grd.addColorStop(0.45, `rgba(20,32,36,${0.5 * a})`);
    grd.addColorStop(1, `rgba(6,10,13,${0.62 * a})`);
    ctx.fillStyle = grd;
    ctx.fill(body);

    // the lure's light landing on her own face — kept inside the silhouette
    ctx.save();
    ctx.clip(body);
    const face = ctx.createRadialGradient(lx, ly, 4, lx, ly, 190);
    face.addColorStop(0, `rgba(126,214,196,${0.3 * glow})`);
    face.addColorStop(0.5, `rgba(80,140,132,${0.1 * glow})`);
    face.addColorStop(1, 'rgba(80,140,132,0)');
    ctx.fillStyle = face;
    ctx.fillRect(bx - 140, cy - 100, 280, 200);
    ctx.restore();

    // rim light along the brow and back, fading toward the tail
    const rim = ctx.createLinearGradient(bx - 66, cy, bx + 60, cy - 50);
    rim.addColorStop(0, `rgba(150,235,220,${0.3 * glow})`);
    rim.addColorStop(1, 'rgba(150,235,220,0)');
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bx - 62, cy + 2);
    ctx.quadraticCurveTo(bx - 66, cy - 44, bx - 8, cy - 52);
    ctx.quadraticCurveTo(bx + 30, cy - 55.5, bx + 56, cy - 44);
    ctx.stroke();

    // jaw gape — darker wedge
    const gape = 0.16 + 0.05 * Math.sin(t * 0.5);
    ctx.fillStyle = `rgba(1,2,4,${0.85 * a})`;
    ctx.beginPath();
    ctx.moveTo(bx - 62, cy + 4);
    ctx.quadraticCurveTo(bx - 30, cy - 4 - 60 * gape, bx - 2, cy - 6 - 40 * gape);
    ctx.quadraticCurveTo(bx - 26, cy + 8, bx - 8, cy + 26);
    ctx.quadraticCurveTo(bx - 40, cy + 26, bx - 62, cy + 4);
    ctx.fill();

    // needle teeth — recurved, both jaws, catching the lure light
    ctx.strokeStyle = `rgba(230,255,247,${0.32 * glow})`;
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 7; i++) {
      const s = i / 6;
      const tx = bx - 57 + i * 8.2;
      const tyU = cy - 1 - 46 * gape * (0.35 + 0.65 * Math.sin(0.4 + s * 2.6));
      const ln = 7 + (i % 3) * 3.5;
      ctx.beginPath();
      ctx.moveTo(tx, tyU);
      ctx.quadraticCurveTo(tx + 3.4, tyU + ln * 0.55, tx + 1.2, tyU + ln);
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const tx = bx - 50 + i * 8.8;
      const tyL = cy + 22 - i * 1.2;
      const ln = 6 + (i % 2) * 3;
      ctx.beginPath();
      ctx.moveTo(tx, tyL);
      ctx.quadraticCurveTo(tx - 2.8, tyL - ln * 0.6, tx - 0.8, tyL - ln);
      ctx.stroke();
    }

    // dorsal spines — a suggestion of fin rays along the back
    ctx.strokeStyle = `rgba(120,190,180,${0.11 * glow})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const sx = bx + 16 + i * 15;
      const sy = cy - 53 + i * 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 4 + i, sy - 9 - (i % 2) * 3);
      ctx.stroke();
    }

    // eye — small, catching lure light
    ctx.fillStyle = `rgba(170,235,225,${0.28 * glow})`;
    ctx.beginPath();
    ctx.arc(bx - 18, cy - 24, 3.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(240,255,250,${0.5 * glow})`;
    ctx.beginPath();
    ctx.arc(bx - 19, cy - 25, 1.1, 0, TAU);
    ctx.fill();

    // illicium — thin rod from forehead to lure
    ctx.strokeStyle = `rgba(150,220,210,${0.14 * glow})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx - 26, cy - 46);
    ctx.quadraticCurveTo((bx - 26 + lx) / 2 - 14, cy - 78, lx, ly);
    ctx.stroke();

    // the lure — layered glow
    let rg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 95);
    rg.addColorStop(0, `rgba(120,245,215,${0.16 * glow})`);
    rg.addColorStop(1, 'rgba(120,245,215,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(lx, ly, 95, 0, TAU); ctx.fill();

    rg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 26);
    rg.addColorStop(0, `rgba(170,255,230,${0.55 * glow})`);
    rg.addColorStop(1, 'rgba(170,255,230,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(lx, ly, 26, 0, TAU); ctx.fill();

    rg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 6);
    rg.addColorStop(0, `rgba(242,255,249,${0.95 * glow})`);
    rg.addColorStop(1, 'rgba(242,255,249,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(lx, ly, 6, 0, TAU); ctx.fill();

    ctx.restore();
  },
};

/* ---------------------------------------------------------------- */
/* DUMBO OCTOPUS — 4,050 m. Ear-fins rowing, checking our papers.    */
/* ---------------------------------------------------------------- */

const dumbo = {
  name: 'dumbo',
  depth: 4050,
  span: 260,
  draw(ctx, e) {
    const { t, W, H, a } = e;
    const yc = transitY(e, 0.7);
    const cx = W * (0.6 - 0.08 * Math.sin(t * 0.045 + 2)) ;
    const cy = yc + Math.sin(t * 0.5) * 9;
    const tilt = Math.sin(t * 0.35) * 0.13;
    const flap = Math.sin(t * 0.85);

    ctx.save();

    // VELA's port floodlight grazing it — faint warm wash from the left
    const wash = ctx.createRadialGradient(cx - W * 0.28, cy - 40, 20, cx - W * 0.28, cy - 40, W * 0.42);
    wash.addColorStop(0, `rgba(255,238,214,${0.055 * a})`);
    wash.addColorStop(1, 'rgba(255,238,214,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    ctx.translate(cx, cy);
    ctx.rotate(tilt);

    // ear fins (behind mantle)
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 40, -30);
      ctx.rotate(side * (0.62 + flap * 0.5));
      const fg = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
      fg.addColorStop(0, `rgba(214,166,178,${0.42 * a})`);
      fg.addColorStop(1, `rgba(180,128,142,${0.16 * a})`);
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 11, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // mantle — soft, lit from the left
    const mg = ctx.createRadialGradient(-22, -26, 8, 0, -4, 78);
    mg.addColorStop(0, `rgba(222,178,190,${0.5 * a})`);
    mg.addColorStop(0.55, `rgba(186,136,150,${0.4 * a})`);
    mg.addColorStop(1, `rgba(120,80,94,${0.22 * a})`);
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.ellipse(0, -8, 52, 46, 0, 0, TAU);
    ctx.fill();

    // webbed skirt with scalloped arm edge
    ctx.beginPath();
    ctx.moveTo(-50, 8);
    for (let k = 0; k <= 8; k++) {
      const px = -50 + (k / 8) * 100;
      const wob = Math.sin(t * 1.25 + k * 1.4) * 4;
      const py = 34 + Math.sin(k * 1.05 + 0.6) * 7 + wob;
      const cxk = px - 6.25;
      ctx.quadraticCurveTo(cxk, py + 13, px, py);
    }
    ctx.quadraticCurveTo(52, 2, 50, -2);
    ctx.lineTo(-50, -2);
    ctx.closePath();
    const sg = ctx.createLinearGradient(0, -2, 0, 46);
    sg.addColorStop(0, `rgba(196,146,160,${0.4 * a})`);
    sg.addColorStop(1, `rgba(140,94,108,${0.24 * a})`);
    ctx.fillStyle = sg;
    ctx.fill();

    // arm hint lines under the web
    ctx.strokeStyle = `rgba(110,70,84,${0.28 * a})`;
    ctx.lineWidth = 1.1;
    for (let k = 1; k < 8; k++) {
      const px = -50 + (k / 8) * 100;
      ctx.beginPath();
      ctx.moveTo(px * 0.55, 4);
      ctx.quadraticCurveTo(px * 0.8, 20, px, 32 + Math.sin(t * 1.25 + k * 1.4) * 4);
      ctx.stroke();
    }

    // eyes
    for (const side of [-1, 1]) {
      ctx.fillStyle = `rgba(34,20,28,${0.75 * a})`;
      ctx.beginPath();
      ctx.arc(side * 19, -14, 4.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(255,240,230,${0.4 * a})`;
      ctx.beginPath();
      ctx.arc(side * 19 - 1.4, -15.6, 1.2, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  },
};

export const creatures = [siphonophore, scatteringLayer, lanternfish, anglerfish, dumbo];
