/* COLDCASE — procedural textures & photographs.
   Everything visual is synthesized here: cork, and the five "polaroids". */
(function () {
  'use strict';

  // Deterministic PRNG so the file always looks like the same file.
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------- cork board tile ---------------- */
  function corkTile() {
    const S = 340, c = document.createElement('canvas');
    c.width = S; c.height = S;
    const x = c.getContext('2d');
    const rnd = mulberry(19740117);
    const img = x.createImageData(S, S);
    const d = img.data;
    for (let i = 0; i < S * S; i++) {
      const px = i % S, py = (i / S) | 0;
      // low-frequency mottling + per-pixel grain
      const low = Math.sin(px * 0.045 + Math.sin(py * 0.03) * 2.1) * Math.cos(py * 0.038 + px * 0.011);
      let v = (rnd() - 0.5) * 30 + low * 9;
      const j = i * 4;
      d[j] = 110 + v; d[j + 1] = 74 + v * 0.82; d[j + 2] = 39 + v * 0.6; d[j + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    // cork flecks: lighter chips and dark pores
    for (let i = 0; i < 420; i++) {
      const w = 1.5 + rnd() * 5, h = 1 + rnd() * 3;
      x.fillStyle = rnd() > 0.46 ? 'rgba(146,104,58,' + (0.14 + rnd() * 0.22) + ')'
                                 : 'rgba(58,36,14,' + (0.12 + rnd() * 0.2) + ')';
      x.save();
      x.translate(rnd() * S, rnd() * S);
      x.rotate(rnd() * Math.PI);
      x.beginPath(); x.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); x.fill();
      x.restore();
    }
    for (let i = 0; i < 130; i++) { // pinprick holes of boards past
      x.fillStyle = 'rgba(40,22,6,' + (0.1 + rnd() * 0.25) + ')';
      x.beginPath(); x.arc(rnd() * S, rnd() * S, 0.6 + rnd() * 0.9, 0, Math.PI * 2); x.fill();
    }
    return c.toDataURL('image/png');
  }

  /* ---------------- polaroid helpers ---------------- */
  const W = 300, H = 300;

  function finish(x, rnd, opts) {
    opts = opts || {};
    // grain
    for (let i = 0; i < 1500; i++) {
      const a = 0.02 + rnd() * 0.05;
      x.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')';
      x.fillRect(rnd() * W, rnd() * H, 1.2, 1.2);
    }
    // chrome fade: cyan shadows, warm wash
    x.fillStyle = 'rgba(90,140,150,' + (opts.cyan ?? 0.09) + ')';
    x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(214,160,80,' + (opts.warm ?? 0.07) + ')';
    x.fillRect(0, 0, W, H);
    // vignette
    const v = x.createRadialGradient(W / 2, H / 2, W * 0.32, W / 2, H / 2, W * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(8,6,2,' + (opts.vig ?? 0.5) + ')');
    x.fillStyle = v; x.fillRect(0, 0, W, H);
    // light leak
    if (opts.leak !== false) {
      const l = x.createLinearGradient(W, 0, W - 70, 0);
      l.addColorStop(0, 'rgba(230,140,60,' + (opts.leakA ?? 0.14) + ')');
      l.addColorStop(1, 'rgba(230,140,60,0)');
      x.fillStyle = l; x.fillRect(W - 70, 0, 70, H);
    }
    // lifted blacks
    x.fillStyle = 'rgba(180,180,168,0.05)';
    x.fillRect(0, 0, W, H);
  }

  function snowfall(x, rnd, n, dim) {
    for (let i = 0; i < n; i++) {
      x.fillStyle = 'rgba(235,238,240,' + (0.25 + rnd() * (dim ? 0.3 : 0.55)) + ')';
      const r = 0.7 + rnd() * 1.6;
      x.beginPath(); x.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2); x.fill();
    }
  }

  /* P-1 — the Valiant in the landing lot, night */
  function sceneValiant(x) {
    const rnd = mulberry(101);
    const sky = x.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#141c26'); sky.addColorStop(0.55, '#0e141b'); sky.addColorStop(1, '#0a0d10');
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    // sodium lamp, top right
    const lampX = 246, lampY = 34;
    const glow = x.createRadialGradient(lampX, lampY, 2, lampX, lampY, 170);
    glow.addColorStop(0, 'rgba(248,204,110,1)');
    glow.addColorStop(0.1, 'rgba(232,176,84,0.62)');
    glow.addColorStop(1, 'rgba(220,150,60,0)');
    x.fillStyle = glow; x.fillRect(0, 0, W, H);
    // light cone onto the lot
    x.save();
    const cone = x.createLinearGradient(lampX, lampY, 130, 260);
    cone.addColorStop(0, 'rgba(235,185,95,0.28)'); cone.addColorStop(1, 'rgba(235,185,95,0)');
    x.fillStyle = cone;
    x.beginPath(); x.moveTo(lampX - 6, lampY); x.lineTo(30, 262); x.lineTo(268, 262); x.closePath(); x.fill();
    x.restore();
    x.strokeStyle = '#0c0e10'; x.lineWidth = 5;
    x.beginPath(); x.moveTo(lampX + 16, 20); x.lineTo(lampX + 16, 210); x.stroke(); // pole
    x.beginPath(); x.moveTo(lampX + 16, 30); x.lineTo(lampX - 4, 34); x.stroke();
    // ground
    const gr = x.createLinearGradient(0, 190, 0, H);
    gr.addColorStop(0, '#20201e'); gr.addColorStop(1, '#16130f');
    x.fillStyle = gr; x.fillRect(0, 190, W, H - 190);
    for (let i = 0; i < 700; i++) { // gravel
      x.fillStyle = 'rgba(' + (140 + rnd() * 60 | 0) + ',' + (120 + rnd() * 40 | 0) + ',' + (80 + rnd() * 30 | 0) + ',' + (0.05 + rnd() * 0.12) + ')';
      x.fillRect(rnd() * W, 195 + rnd() * 105, 1.6, 1);
    }
    // fence line
    x.strokeStyle = 'rgba(60,55,45,0.9)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, 192); x.lineTo(W, 188); x.stroke();
    for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(i * 27 + 6, 188); x.lineTo(i * 27 + 6, 168); x.stroke(); }
    // the Valiant — 3/4 silhouette catching the lamp
    x.save(); x.translate(58, 176);
    x.fillStyle = '#241f19';
    x.beginPath(); // body
    x.moveTo(0, 46); x.lineTo(4, 26); x.quadraticCurveTo(10, 20, 34, 18);
    x.quadraticCurveTo(46, 2, 78, 0); x.quadraticCurveTo(110, 0, 122, 16);
    x.quadraticCurveTo(158, 18, 168, 26); x.lineTo(172, 46);
    x.quadraticCurveTo(86, 54, 0, 46); x.closePath(); x.fill();
    // lamplit top edge
    x.strokeStyle = 'rgba(240,196,110,0.95)'; x.lineWidth = 2.6;
    x.beginPath(); x.moveTo(34, 18); x.quadraticCurveTo(46, 2, 78, 0); x.quadraticCurveTo(110, 0, 122, 16); x.stroke();
    x.strokeStyle = 'rgba(226,178,96,0.4)';
    x.beginPath(); x.moveTo(122, 16); x.quadraticCurveTo(158, 18, 168, 26); x.stroke();
    // windows
    x.fillStyle = 'rgba(96,110,118,0.4)';
    x.beginPath(); x.moveTo(44, 17); x.quadraticCurveTo(52, 5, 76, 4); x.lineTo(76, 17); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(82, 4); x.quadraticCurveTo(106, 5, 116, 16); x.lineTo(82, 17); x.closePath(); x.fill();
    // wheels
    x.fillStyle = '#0c0a08';
    x.beginPath(); x.arc(38, 48, 13, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(136, 48, 13, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(180,170,150,0.25)';
    x.beginPath(); x.arc(38, 48, 5, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(136, 48, 5, 0, Math.PI * 2); x.fill();
    // snow on hood/roof
    x.fillStyle = 'rgba(222,226,228,0.5)';
    x.beginPath(); x.moveTo(36, 17); x.quadraticCurveTo(48, 3, 78, 1); x.quadraticCurveTo(108, 1, 120, 15);
    x.quadraticCurveTo(108, 8, 78, 6); x.quadraticCurveTo(50, 8, 36, 17); x.closePath(); x.fill();
    x.restore();
    snowfall(x, rnd, 60, false);
    finish(x, rnd, { vig: 0.55, cyan: 0.1 });
  }

  /* P-2 — ticket window, Harlow Landing, night */
  function sceneKiosk(x) {
    const rnd = mulberry(202);
    const sky = x.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#10161e'); sky.addColorStop(1, '#0a0e12');
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    // wet planks in perspective
    x.fillStyle = '#151311'; x.fillRect(0, 200, W, 100);
    x.strokeStyle = 'rgba(70,66,58,0.5)'; x.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      x.beginPath(); x.moveTo(150 - 260 * t, H); x.lineTo(150 - 30 * t, 200); x.stroke();
      x.beginPath(); x.moveTo(150 + 260 * t, H); x.lineTo(150 + 30 * t, 200); x.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const y = 205 + i * i * 3.6;
      x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
    }
    // string of dock lights receding right
    for (let i = 0; i < 6; i++) {
      const lx = 150 + i * 26, ly = 120 - i * 6, r = 26 - i * 3.4;
      const g = x.createRadialGradient(lx, ly, 0.5, lx, ly, r);
      g.addColorStop(0, 'rgba(235,190,110,0.9)'); g.addColorStop(0.15, 'rgba(220,165,80,0.4)'); g.addColorStop(1, 'rgba(220,160,70,0)');
      x.fillStyle = g; x.beginPath(); x.arc(lx, ly, r, 0, Math.PI * 2); x.fill();
      // reflection smear
      const rg = x.createLinearGradient(lx, 205, lx, 265 - i * 6);
      rg.addColorStop(0, 'rgba(220,165,80,0.28)'); rg.addColorStop(1, 'rgba(220,165,80,0)');
      x.fillStyle = rg; x.fillRect(lx - 2.4, 205, 4.8, 60 - i * 6);
    }
    // kiosk hut
    x.save(); x.translate(34, 92);
    x.fillStyle = '#1d1913';
    x.fillRect(0, 20, 96, 118); // walls
    x.beginPath(); x.moveTo(-8, 22); x.lineTo(48, -6); x.lineTo(104, 22); x.closePath(); x.fill(); // roof
    x.fillStyle = 'rgba(228,238,240,0.55)'; // snow on roof
    x.beginPath(); x.moveTo(-6, 20); x.lineTo(48, -4); x.lineTo(102, 20); x.lineTo(96, 22); x.lineTo(48, 2); x.lineTo(0, 22); x.closePath(); x.fill();
    // lit ticket window
    const wg = x.createRadialGradient(48, 66, 4, 48, 66, 90);
    wg.addColorStop(0, 'rgba(240,200,120,0.55)'); wg.addColorStop(1, 'rgba(240,200,120,0)');
    x.fillStyle = wg; x.fillRect(-40, -10, 180, 170);
    x.fillStyle = '#e8bd6e'; x.fillRect(26, 46, 44, 40);
    x.strokeStyle = '#141210'; x.lineWidth = 3;
    x.strokeRect(26, 46, 44, 40);
    x.beginPath(); x.moveTo(48, 46); x.lineTo(48, 86); x.stroke();
    // counter slot + silhouette of the agent's lamp
    x.fillStyle = '#141210'; x.fillRect(30, 78, 36, 4);
    x.fillStyle = 'rgba(20,16,10,0.85)';
    x.beginPath(); x.arc(38, 62, 6, Math.PI, 0); x.fill(); // lamp shade shape in window
    // TICKETS board
    x.fillStyle = '#242019'; x.fillRect(18, 26, 60, 13);
    x.fillStyle = 'rgba(235,205,140,0.8)';
    x.font = '700 9px "Courier Prime", monospace'; x.textAlign = 'center';
    x.fillText('T I C K E T S', 48, 36);
    x.restore();
    snowfall(x, rnd, 90, false);
    finish(x, rnd, { vig: 0.5, cyan: 0.12, leakA: 0.1 });
  }

  /* P-3 — piling 7, flash photograph */
  function scenePiling(x) {
    const rnd = mulberry(303);
    x.fillStyle = '#07090b'; x.fillRect(0, 0, W, H); // night water
    // faint chop lines
    for (let i = 0; i < 40; i++) {
      x.strokeStyle = 'rgba(120,140,150,' + (0.03 + rnd() * 0.08) + ')';
      const y = 150 + rnd() * 150;
      x.beginPath(); x.moveTo(rnd() * W, y); x.lineTo(rnd() * W, y + (rnd() - 0.5) * 4); x.stroke();
    }
    // flash center
    const fg = x.createRadialGradient(128, 138, 10, 128, 138, 240);
    fg.addColorStop(0, 'rgba(210,205,190,0.32)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = fg; x.fillRect(0, 0, W, H);
    // the piling
    x.save(); x.translate(104, 0);
    const wood = x.createLinearGradient(0, 0, 62, 0);
    wood.addColorStop(0, '#2a2016'); wood.addColorStop(0.4, '#7d6448'); wood.addColorStop(0.62, '#93755a'); wood.addColorStop(1, '#241a10');
    x.fillStyle = wood; x.fillRect(0, -4, 62, 260);
    // wood grain
    for (let i = 0; i < 26; i++) {
      x.strokeStyle = 'rgba(30,20,10,' + (0.15 + rnd() * 0.3) + ')'; x.lineWidth = 0.8 + rnd();
      const gx = 4 + rnd() * 54;
      x.beginPath(); x.moveTo(gx, 0);
      x.bezierCurveTo(gx + (rnd() - .5) * 8, 80, gx + (rnd() - .5) * 8, 170, gx + (rnd() - .5) * 6, 256);
      x.stroke();
    }
    // bolt + number board
    x.fillStyle = '#1b140c'; x.fillRect(8, 36, 46, 30);
    x.fillStyle = '#c8bfa8'; x.font = '700 24px "Courier Prime", monospace'; x.textAlign = 'center';
    x.fillText('7', 31, 59);
    x.strokeStyle = '#c8bfa8'; x.lineWidth = 1.4; x.strokeRect(8, 36, 46, 30);
    // waterline + mussel band
    x.fillStyle = 'rgba(8,10,10,0.9)'; x.fillRect(-2, 236, 66, 26);
    for (let i = 0; i < 90; i++) {
      x.fillStyle = 'rgba(' + (20 + rnd() * 30 | 0) + ',' + (26 + rnd() * 30 | 0) + ',' + (30 + rnd() * 24 | 0) + ',0.95)';
      x.beginPath(); x.ellipse(rnd() * 62, 196 + rnd() * 48, 2.6, 4 + rnd() * 3, rnd() * 3, 0, Math.PI * 2); x.fill();
    }
    // wet sheen above waterline
    x.fillStyle = 'rgba(160,180,180,0.12)'; x.fillRect(0, 180, 62, 56);
    // THE BUTTON — snagged on the mussel line
    x.fillStyle = '#ded8c6';
    x.beginPath(); x.arc(40, 208, 5.6, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(120,110,90,0.8)';
    for (const [hx, hy] of [[-1.7, -1.6], [1.7, -1.6], [-1.7, 1.6], [1.7, 1.6]]) {
      x.beginPath(); x.arc(40 + hx, 208 + hy, 0.9, 0, Math.PI * 2); x.fill();
    }
    // wool strand
    x.strokeStyle = 'rgba(150,148,140,0.8)'; x.lineWidth = 1.1;
    x.beginPath(); x.moveTo(43, 204); x.bezierCurveTo(52, 196, 50, 188, 58, 184); x.stroke();
    x.restore();
    // chalk circle + arrow (drawn on the print by hand)
    x.strokeStyle = 'rgba(238,238,230,0.92)'; x.lineWidth = 2.6; x.lineCap = 'round';
    x.beginPath(); x.ellipse(145, 208, 26, 21, -0.15, 0.15, Math.PI * 2.18); x.stroke();
    x.beginPath(); x.moveTo(196, 168); x.lineTo(168, 194); x.stroke();
    x.beginPath(); x.moveTo(168, 194); x.lineTo(180, 190); x.moveTo(168, 194); x.lineTo(173, 182); x.stroke();
    x.font = '400 15px "Caveat", cursive'; x.fillStyle = 'rgba(238,238,230,0.92)'; x.textAlign = 'left';
    x.fillText('E-6', 200, 162);
    finish(x, rnd, { vig: 0.72, cyan: 0.06, warm: 0.03, leak: false });
  }

  /* P-4 — the kettle, morning after */
  function sceneKettle(x) {
    const rnd = mulberry(404);
    // warm dim kitchen wall
    const wall = x.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#3d3223'); wall.addColorStop(1, '#2b2115');
    x.fillStyle = wall; x.fillRect(0, 0, W, H);
    // grey window, morning light
    x.fillStyle = '#8b959b'; x.fillRect(170, 26, 104, 120);
    const wl = x.createLinearGradient(170, 0, 60, 300);
    wl.addColorStop(0, 'rgba(160,175,185,0.22)'); wl.addColorStop(1, 'rgba(160,175,185,0)');
    x.fillStyle = wl; x.beginPath();
    x.moveTo(170, 26); x.lineTo(274, 26); x.lineTo(140, 300); x.lineTo(0, 300); x.closePath(); x.fill();
    x.strokeStyle = '#1f1811'; x.lineWidth = 6; x.strokeRect(170, 26, 104, 120);
    x.beginPath(); x.moveTo(222, 26); x.lineTo(222, 146); x.moveTo(170, 86); x.lineTo(274, 86); x.stroke();
    // curtain edge
    x.fillStyle = 'rgba(120,90,60,0.5)'; x.fillRect(160, 20, 14, 132);
    // counter + stove
    x.fillStyle = '#171310'; x.fillRect(0, 196, W, 104);
    x.fillStyle = '#26201a'; x.fillRect(0, 188, W, 12);
    // burner rings
    x.strokeStyle = '#0d0b09'; x.lineWidth = 5;
    x.beginPath(); x.ellipse(96, 200, 44, 10, 0, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.ellipse(224, 202, 34, 8, 0, 0, Math.PI * 2); x.stroke();
    // LOW knob glint
    x.fillStyle = 'rgba(200,60,30,0.85)'; x.beginPath(); x.arc(36, 246, 4, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(220,210,190,0.55)'; x.font = '700 8px "Courier Prime", monospace'; x.textAlign = 'center';
    x.fillText('LOW', 36, 262);
    // the kettle
    x.save(); x.translate(96, 148);
    x.fillStyle = '#211d18';
    x.beginPath(); // body
    x.moveTo(-38, 50); x.quadraticCurveTo(-46, 12, -20, 2);
    x.quadraticCurveTo(0, -6, 22, 2); x.quadraticCurveTo(46, 12, 38, 50); x.closePath(); x.fill();
    // split seam
    x.strokeStyle = 'rgba(90,80,66,0.9)'; x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(-30, 34); x.quadraticCurveTo(-6, 40, 18, 33); x.stroke();
    x.strokeStyle = 'rgba(140,120,90,0.6)'; x.lineWidth = 0.8;
    x.beginPath(); x.moveTo(-8, 36); x.lineTo(-2, 44); x.stroke();
    // spout + handle
    x.fillStyle = '#211d18';
    x.beginPath(); x.moveTo(34, 14); x.quadraticCurveTo(52, 8, 56, -4); x.lineTo(46, -6); x.quadraticCurveTo(44, 4, 30, 8); x.closePath(); x.fill();
    x.strokeStyle = '#211d18'; x.lineWidth = 7;
    x.beginPath(); x.arc(0, -6, 26, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
    // window light on the flank
    x.strokeStyle = 'rgba(170,180,185,0.5)'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(16, 4); x.quadraticCurveTo(34, 12, 30, 42); x.stroke();
    x.restore();
    // the one cup, dry teabag
    x.fillStyle = '#d8cfb8';
    x.fillRect(196, 172, 26, 20);
    x.strokeStyle = '#d8cfb8'; x.lineWidth = 3;
    x.beginPath(); x.arc(226, 182, 7, -Math.PI / 2, Math.PI / 2); x.stroke();
    x.strokeStyle = 'rgba(120,100,70,0.9)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(206, 174); x.lineTo(212, 162); x.stroke(); // teabag string
    x.fillStyle = 'rgba(200,190,160,0.9)'; x.fillRect(209, 156, 7, 7);
    finish(x, rnd, { vig: 0.5, warm: 0.14, cyan: 0.04, leakA: 0.1 });
  }

  /* P-5 — the only photograph, overexposed, Sept 1973 */
  function sceneOverexposed(x) {
    const rnd = mulberry(505);
    x.fillStyle = '#e9e4d2'; x.fillRect(0, 0, W, H);
    // blown sky / water split
    x.fillStyle = 'rgba(196,196,180,0.7)'; x.fillRect(0, 168, W, 132);
    x.strokeStyle = 'rgba(168,166,148,0.8)'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(0, 168); x.lineTo(W, 166); x.stroke();
    // glare bloom
    const g = x.createRadialGradient(84, 66, 6, 84, 66, 190);
    g.addColorStop(0, 'rgba(255,255,250,0.95)'); g.addColorStop(1, 'rgba(255,255,250,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // picnic rail
    x.strokeStyle = 'rgba(150,146,128,0.75)'; x.lineWidth = 5;
    x.beginPath(); x.moveTo(0, 210); x.lineTo(W, 198); x.stroke();
    x.lineWidth = 3;
    for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(20 + i * 44, 208 - i * 0.5); x.lineTo(22 + i * 44, 262); x.stroke(); }
    // her — a pale silhouette at the rail, mid-laugh, face lost to the light
    x.save(); x.translate(196, 118);
    x.fillStyle = 'rgba(158,152,132,0.85)';
    x.beginPath(); x.arc(0, 0, 15, 0, Math.PI * 2); x.fill(); // head, tilted back
    x.beginPath(); // scarf tail in the wind
    x.moveTo(10, 4); x.quadraticCurveTo(30, 2, 38, -8); x.quadraticCurveTo(30, 8, 14, 10); x.closePath(); x.fill();
    x.beginPath(); // shoulders + cardigan
    x.moveTo(-22, 30); x.quadraticCurveTo(-16, 12, 0, 12); x.quadraticCurveTo(16, 12, 22, 30);
    x.lineTo(18, 92); x.quadraticCurveTo(0, 98, -18, 92); x.closePath(); x.fill();
    // skirt
    x.beginPath(); x.moveTo(-18, 88); x.lineTo(18, 88); x.lineTo(26, 148); x.lineTo(-26, 148); x.closePath(); x.fill();
    // arm on rail
    x.beginPath(); x.moveTo(18, 34); x.quadraticCurveTo(44, 50, 58, 76); x.lineTo(50, 84); x.quadraticCurveTo(36, 58, 12, 46); x.closePath(); x.fill();
    // overexposure eats the edges
    x.fillStyle = 'rgba(233,228,210,0.45)';
    x.beginPath(); x.arc(0, 0, 17, 0, Math.PI * 2); x.fill();
    x.restore();
    // chemical blotches
    for (let i = 0; i < 8; i++) {
      x.fillStyle = 'rgba(210,190,150,' + (0.06 + rnd() * 0.1) + ')';
      x.beginPath(); x.arc(rnd() * W, rnd() * H, 14 + rnd() * 30, 0, Math.PI * 2); x.fill();
    }
    finish(x, rnd, { vig: 0.16, cyan: 0.13, warm: 0.1, leakA: 0.22 });
  }

  const scenes = { valiant: sceneValiant, kiosk: sceneKiosk, piling: scenePiling, kettle: sceneKettle, overexposed: sceneOverexposed };

  window.CC = {
    corkTile,
    paint(canvas, name) {
      canvas.width = W; canvas.height = H;
      const x = canvas.getContext('2d');
      scenes[name](x);
    }
  };
})();
