/* ============================================================
   Seifū-an — main.js
   Seasons, compositions, reveals, reservations.
   ============================================================ */
'use strict';
(function () {

  const SumiPainter = window.Sumi && window.Sumi.SumiPainter;
  if (!SumiPainter) return;

  const root = document.documentElement;
  const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* warm the seal glyph so the hanko never falls back mid-stamp */
  if (document.fonts && document.fonts.load) {
    document.fonts.load('500 40px "Noto Serif JP"', '茶清風庵');
  }

  /* ================= season data ================= */

  const SEASONS = {
    spring: {
      kanji: '春', en: 'Spring', months: [2, 3, 4],
      paint: {
        ink: [36, 32, 29], far: 0.34, near: 0.85, mist: true,
        mistColor: [104, 110, 118], dabs: 'petals', divInk: 0.8,
        bloom: [208, 142, 160], deep: [150, 71, 93]
      },
      heroLine: 'It is spring at the ridge. The last snow is off the steps, and the mountain cherries below the room open in mid-April.',
      haiku: {
        jp: ['様々の', '事おもひ出す', '桜かな'],
        romaji: 'samazama no / koto omoidasu / sakura kana',
        en: 'How many, many things they call to mind — these cherry blossoms.',
        cite: 'Matsuo Bashō, 1688'
      },
      wagashi: [
        { jp: '桜餅', name: 'Sakura-mochi', desc: 'Dōmyōji rice folded around red-bean paste, wrapped in a salted cherry leaf from the trees below the room.', price: '¥700' },
        { jp: '鶯餅', name: 'Uguisu-mochi', desc: 'Soft mochi dusted with green soybean flour, shaped like the bush warbler you will hear from the arbor.', price: '¥650' },
        { jp: '蓬饅頭', name: 'Yomogi manjū', desc: 'A steamed mugwort bun; the leaves are picked on the path on the way up.', price: '¥650' }
      ]
    },
    summer: {
      kanji: '夏', en: 'Summer', months: [5, 6, 7],
      paint: {
        ink: [29, 32, 28], far: 0.36, near: 0.92, mist: true,
        mistColor: [100, 112, 104], dabs: 'birds', forest: true, divInk: 0.85,
        bloom: [78, 122, 92], deep: [51, 89, 63]
      },
      heroLine: 'It is summer at the ridge. The path is deep green, the stream is loud, and the room stays cool until evening.',
      haiku: {
        jp: ['閑さや', '岩にしみ入る', '蝉の声'],
        romaji: 'shizukasa ya / iwa ni shimiiru / semi no koe',
        en: 'Stillness — sinking into the rocks, the cicada’s cry.',
        cite: 'Matsuo Bashō, 1689'
      },
      wagashi: [
        { jp: '水羊羹', name: 'Mizu-yōkan', desc: 'Chilled azuki jelly set with spring water, cut cold in the well house.', price: '¥700' },
        { jp: '葛饅頭', name: 'Kuzu-manjū', desc: 'Bean paste inside a clear kudzu skin — held to the window, it shows the ravine.', price: '¥750' },
        { jp: '蕨餅', name: 'Warabi-mochi', desc: 'Bracken-starch mochi under roasted soy flour and a thread of black sugar.', price: '¥700' }
      ]
    },
    autumn: {
      kanji: '秋', en: 'Autumn', months: [8, 9, 10],
      paint: {
        ink: [43, 33, 25], far: 0.32, near: 0.88, mist: true,
        mistColor: [116, 106, 96], dabs: 'leaves', divInk: 0.82,
        bloom: [206, 106, 43], deep: [153, 71, 26]
      },
      heroLine: 'It is autumn at the ridge. The maples turn from the top down, and the charcoal smells sweeter in cold air.',
      haiku: {
        jp: ['この道や', '行く人なしに', '秋の暮'],
        romaji: 'kono michi ya / yuku hito nashi ni / aki no kure',
        en: 'This road — no one goes down it. Autumn evening.',
        cite: 'Matsuo Bashō, 1694'
      },
      wagashi: [
        { jp: '栗きんとん', name: 'Kuri kinton', desc: 'Mountain chestnuts and nothing else, pressed by hand into a chestnut’s shape.', price: '¥800' },
        { jp: '紅葉練切', name: 'Momiji nerikiri', desc: 'White-bean confection folded and cut into a maple leaf, matched to the ridge’s actual color that week.', price: '¥750' },
        { jp: '芋羊羹', name: 'Imo-yōkan', desc: 'Firm roasted sweet-potato yōkan from a farm at the foot station.', price: '¥650' }
      ]
    },
    winter: {
      kanji: '冬', en: 'Winter', months: [11, 0, 1],
      paint: {
        ink: [56, 62, 68], far: 0.22, near: 0.6, mist: false,
        sparse: true, dabs: 'snow', divInk: 0.6,
        bloom: [140, 160, 174], deep: [78, 100, 115]
      },
      heroLine: 'It is winter at the ridge. We light lanterns on the stone steps and keep the kettle louder than the snow.',
      haiku: {
        jp: ['初雪や', '水仙の葉の', 'たわむまで'],
        romaji: 'hatsuyuki ya / suisen no ha no / tawamu made',
        en: 'First snow — just enough to bend the narcissus leaves.',
        cite: 'Matsuo Bashō, 1686'
      },
      wagashi: [
        { jp: '柚子饅頭', name: 'Yuzu manjū', desc: 'A steamed bun scented with yuzu from the coast — the only ingredient that travels far.', price: '¥700' },
        { jp: '椿餅', name: 'Tsubaki-mochi', desc: 'Sweet rice pressed between two camellia leaves; the oldest confection in the record, unchanged.', price: '¥750' },
        { jp: '善哉', name: 'Zenzai', desc: 'Thick red-bean soup with a toasted mochi, offered after the last seating in January and February.', price: '¥850' }
      ]
    }
  };

  function seasonForMonth(m) {
    for (const k in SEASONS) if (SEASONS[k].months.indexOf(m) !== -1) return k;
    return 'summer';
  }

  /* ================= compositions ================= */

  function ridgePts(x0, x1, yBase, peakH, peaks, rng) {
    const span = x1 - x0;
    const pts = [{ x: x0, y: yBase - peakH * 0.08 }];
    if (peaks >= 2) {
      pts.push({ x: x0 + span * 0.14, y: yBase - peakH * (0.42 + rng() * 0.15) });
      pts.push({ x: x0 + span * 0.26, y: yBase - peakH * (0.78 + rng() * 0.1) });
      pts.push({ x: x0 + span * (0.33 + rng() * 0.04), y: yBase - peakH * (0.96 + rng() * 0.08) });
      pts.push({ x: x0 + span * 0.42, y: yBase - peakH * (0.64 + rng() * 0.08) });
      pts.push({ x: x0 + span * 0.52, y: yBase - peakH * (0.38 + rng() * 0.08) });
      pts.push({ x: x0 + span * (0.66 + rng() * 0.04), y: yBase - peakH * (0.55 + rng() * 0.12) });
      pts.push({ x: x0 + span * 0.8, y: yBase - peakH * 0.26 });
      pts.push({ x: x0 + span * 0.9, y: yBase - peakH * 0.12 });
      pts.push({ x: x1, y: yBase - peakH * 0.02 });
    } else {
      pts.push({ x: x0 + span * 0.22, y: yBase - peakH * (0.5 + rng() * 0.1) });
      pts.push({ x: x0 + span * (0.36 + rng() * 0.06), y: yBase - peakH });
      pts.push({ x: x0 + span * 0.52, y: yBase - peakH * (0.56 + rng() * 0.05) });
      pts.push({ x: x0 + span * 0.61, y: yBase - peakH * 0.52 }); /* a bench — flat ground for the room */
      pts.push({ x: x0 + span * 0.72, y: yBase - peakH * 0.24 });
      pts.push({ x: x1, y: yBase - peakH * 0.04 });
    }
    return pts;
  }

  function yAt(pts, x) {
    for (let i = 0; i < pts.length - 1; i++) {
      if (x >= pts[i].x && x <= pts[i + 1].x) {
        const t = (x - pts[i].x) / ((pts[i + 1].x - pts[i].x) || 1);
        return pts[i].y + (pts[i + 1].y - pts[i].y) * t;
      }
    }
    return pts[pts.length - 1].y;
  }

  function heroComposer(w, h, rng, season) {
    const P = SEASONS[season].paint;
    const mob = w < 700;
    const ink = P.ink;
    const strokes = [];
    const left = mob ? w * 0.02 : w * 0.42;
    const right = mob ? w * 1.05 : w * 1.06;

    /* distant ridge — barely there, painted first */
    if (!mob && !P.sparse) {
      strokes.push({
        pts: ridgePts(w * 0.58, right, h * 0.27, h * 0.085, 1, rng),
        width: Math.max(5, w * 0.005), ink: P.far * 0.4, color: ink,
        dry: 0.5, speed: 760, delay: 250, bleedP: 0.002
      });
    }

    /* far ridge — pale, quick; enters right of the headline's air */
    strokes.push({
      pts: ridgePts(mob ? left + w * 0.06 : w * 0.505, right, h * (mob ? 0.165 : 0.44), h * (mob ? 0.075 : 0.185), P.sparse ? 1 : 2, rng),
      width: Math.max(8, w * (mob ? 0.018 : 0.0095)), ink: P.far, color: ink,
      dry: 0.55, speed: 700, delay: mob ? 300 : 200, bleedP: 0.004
    });

    /* mist wash between the ridges */
    if (P.mist) {
      strokes.push({
        pts: [
          { x: left + w * 0.04, y: h * (mob ? 0.155 : 0.455) },
          { x: (left + right) / 2, y: h * (mob ? 0.17 : 0.48) },
          { x: right - w * 0.03, y: h * (mob ? 0.15 : 0.45) }
        ],
        width: h * (mob ? 0.035 : 0.075), ink: 0.52, color: P.mistColor || [116, 122, 128],
        wash: true, dry: 0.25, speed: 1400, delay: 200
      });
    }

    /* near ridge — the bold one */
    const nBase = h * (mob ? 0.235 : 0.58);
    const nPeak = h * (mob ? 0.12 : 0.28);
    const nx0 = left + w * (mob ? 0.12 : 0.08);
    const nearW = Math.max(13, w * (mob ? 0.026 : 0.016));
    const nearPts = ridgePts(nx0, right, nBase, nPeak, P.sparse ? 1 : 2, rng);
    strokes.push({
      pts: nearPts, width: nearW, ink: P.near, color: ink,
      dry: P.sparse ? 0.9 : 0.7, speed: 460, delay: 380, bleedP: 0.006
    });

    /* foothill accent */
    if (!P.sparse && !mob) {
      strokes.push({
        pts: [
          { x: w * 0.56, y: h * 0.575 },
          { x: w * 0.68, y: h * 0.535 + (rng() - 0.5) * h * 0.02 },
          { x: w * 0.80, y: h * 0.565 }
        ],
        width: w * 0.009, ink: P.near * 0.45, color: ink, dry: 0.95, speed: 520, delay: 180, bleedP: 0.003
      });
    }

    /* forest wash under the near slope (summer) */
    if (P.forest) {
      strokes.push({
        pts: [
          { x: left + w * (mob ? 0.14 : 0.16), y: nBase - h * 0.006 },
          { x: (left + right) / 2, y: nBase + h * 0.014 },
          { x: right - w * 0.09, y: nBase - h * 0.004 }
        ],
        width: h * (mob ? 0.022 : 0.05), ink: 0.45, color: [74, 96, 74],
        wash: true, dry: 0.35, speed: 1100, delay: 200
      });
    }

    /* the tea room — the painting's namesake. Three strokes on the
       second summit: a dry shelf of ground, a wall, a kasa roof.
       Lifted well clear of the ridge stroke so it silhouettes. */
    const span = right - nx0;
    /* sparse seasons stack both ridge apexes at one x — the summit is
       full of lines there, so the hut moves to the eastern shoulder */
    const hx = nx0 + span * (P.sparse ? 0.565 : 0.66);
    const hy = yAt(nearPts, hx) - nearW * 0.9;
    const hs = mob ? 0.7 : 1;
    strokes.push({ /* the ground it stands on — one dry touch */
      pts: [{ x: hx - 26 * hs, y: hy + 14 * hs }, { x: hx + 30 * hs, y: hy + 15 * hs }],
      width: 7 * hs, ink: P.near * 0.75, color: ink, dry: 0.9, speed: 300, delay: 340, bleedP: 0.004, bristles: 7
    });
    strokes.push({ /* wall — a short wet block, dark, under the eaves */
      pts: [{ x: hx - 14 * hs, y: hy + 5 * hs }, { x: hx + 14 * hs, y: hy + 6 * hs }],
      width: 13 * hs, ink: Math.min(1, P.near * 0.95), color: ink, dab: true, dry: 0.4, speed: 150, delay: 260, bleedP: 0.012, bristles: 6
    });
    strokes.push({ /* kasa roof — one curved sweep, eaves past the wall */
      pts: [
        { x: hx - 35 * hs, y: hy - 1 * hs },
        { x: hx - 2 * hs, y: hy - 20 * hs },
        { x: hx + 33 * hs, y: hy }
      ],
      width: 15 * hs, ink: Math.min(1, P.near + 0.35), color: ink, dab: true, dry: 0.25, speed: 210, delay: 240, bleedP: 0.014, bristles: 8
    });

    /* seasonal dabs */
    const dabZone = {
      x0: mob ? w * 0.08 : w * 0.38, x1: w * 0.97,
      y0: h * (mob ? 0.035 : 0.08), y1: h * (mob ? 0.21 : 0.62)
    };
    if (P.dabs === 'petals') {
      const n = mob ? 7 : 11;
      const skyY1 = h * (mob ? 0.155 : 0.40);
      for (let i = 0; i < n; i++) {
        const cx = dabZone.x0 + rng() * (dabZone.x1 - dabZone.x0);
        const cy = dabZone.y0 + rng() * (skyY1 - dabZone.y0);
        const len = 12 + rng() * 11;
        const dir = rng() < 0.35 ? -0.8 : 1;
        strokes.push({
          pts: [{ x: cx, y: cy }, { x: cx + len * 0.7 * dir, y: cy + len * (0.35 + rng() * 0.35) }],
          width: 11 + rng() * 8, ink: 0.58 + rng() * 0.2, color: P.bloom, dab: true,
          dry: 0.4, speed: 340, delay: i === 0 ? 350 : 80, bleedP: 0.06, bristles: 7
        });
      }
    } else if (P.dabs === 'leaves') {
      const n = mob ? 5 : 8;
      for (let i = 0; i < n; i++) {
        const cx = dabZone.x0 + rng() * (dabZone.x1 - dabZone.x0);
        const cy = dabZone.y0 + rng() * (dabZone.y1 - dabZone.y0);
        const drift = 14 + rng() * 11;
        const dir = rng() < 0.3 ? -0.7 : 1;
        strokes.push({
          pts: [{ x: cx, y: cy }, { x: cx + drift * 0.55 * dir, y: cy + drift * 0.85 }],
          width: 12 + rng() * 7, ink: 0.62 + rng() * 0.2, color: P.bloom, dab: true,
          dry: 0.5, speed: 320, delay: i === 0 ? 350 : 100, bleedP: 0.06, bristles: 8
        });
      }
    } else if (P.dabs === 'snow') {
      /* falling snow: sizes and ink vary widely — some flakes are
         near, wet and heavy; most are far, faint, almost water */
      const n = mob ? 8 : 12;
      const snowY1 = h * (mob ? 0.21 : 0.55);
      for (let i = 0; i < n; i++) {
        const cx = dabZone.x0 + rng() * (dabZone.x1 - dabZone.x0);
        const cy = dabZone.y0 + rng() * (snowY1 - dabZone.y0);
        const sz = 5 + rng() * 8;
        strokes.push({
          pts: [{ x: cx, y: cy }, { x: cx + sz * 0.6 + rng() * 2, y: cy + sz * 0.5 + rng() * 2 }],
          width: sz, ink: 0.5 + rng() * 0.38, color: [118, 138, 152], dab: true,
          dry: 0.3, speed: 420, delay: i === 0 ? 300 : 45, bleedP: 0.04, bristles: 5
        });
      }
    } else if (P.dabs === 'birds') {
      const n = mob ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const cx = w * (mob ? 0.55 + rng() * 0.24 : 0.50 + rng() * 0.20);
        const cy = h * (mob ? 0.05 + rng() * 0.045 : 0.16 + rng() * 0.07);
        const sp = 17 + rng() * 6;
        strokes.push({
          pts: [{ x: cx - sp, y: cy + 3 }, { x: cx - sp * 0.4, y: cy - 6 }, { x: cx, y: cy }],
          width: 5, ink: 0.8, color: ink, dry: 0.5, speed: 260, delay: i === 0 ? 250 : 160, bleedP: 0, bristles: 4
        });
        strokes.push({
          pts: [{ x: cx, y: cy }, { x: cx + sp * 0.6, y: cy - 6 }, { x: cx + sp, y: cy + 3.5 }],
          width: 5, ink: 0.8, color: ink, dry: 0.85, speed: 260, delay: 90, bleedP: 0, bristles: 4
        });
      }
    }

    /* the hanko seal, cut in the season's color */
    strokes.push({
      type: 'seal',
      x: mob ? w * 0.88 : w * 0.905,
      y: mob ? h * 0.055 : h * 0.68,
      size: mob ? 26 : 36,
      rot: -0.07, glyph: '茶', color: P.deep, paper: '#F5F1E6', delay: 550
    });

    return strokes;
  }

  function dividerComposer(w, h, rng, season) {
    const P = SEASONS[season].paint;
    const divInk = P.divInk != null ? P.divInk : 0.8;
    const y = h * (0.42 + rng() * 0.2);
    const len = Math.min(w - 4, w * (0.68 + rng() * 0.3));
    const n = 5;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const edge = (i === 0 || i === n - 1) ? 0.4 : 1;
      pts.push({ x: 2 + (len - 4) * t, y: y + (rng() - 0.5) * h * 0.5 * edge });
    }
    const strokes = [{
      pts: pts, width: h * 0.36, ink: Math.min(1, divInk + 0.12), color: P.ink,
      dry: 0.75 + rng() * 0.3, speed: 720, delay: 80, bleedP: 0.004
    }];
    /* about half the strokes get a drier echo — the brush lifted,
       breathed, and touched the paper once more before leaving */
    if (rng() < 0.55) {
      const ex0 = len * (0.45 + rng() * 0.2);
      const ex1 = Math.min(len - 2, ex0 + len * (0.22 + rng() * 0.2));
      const ey = y + (rng() < 0.5 ? -1 : 1) * h * (0.16 + rng() * 0.1);
      strokes.push({
        pts: [
          { x: ex0, y: ey },
          { x: (ex0 + ex1) / 2, y: ey + (rng() - 0.5) * h * 0.12 },
          { x: ex1, y: ey + (rng() - 0.5) * h * 0.1 }
        ],
        width: h * 0.1, ink: divInk * 0.55, color: P.ink,
        dry: 1.1, speed: 640, delay: 260, bleedP: 0.002, bristles: 8
      });
    }
    return strokes;
  }

  function ensoComposer(w, h, rng, season) {
    const P = SEASONS[season].paint;
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.355;
    const start = -Math.PI * 0.62;
    const sweep = Math.PI * 1.88;
    const n = 22;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = start + sweep * (i / n);
      const r = R * (1 + (rng() - 0.5) * 0.03);
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return [{
      pts: pts, width: Math.min(w, h) * 0.13, ink: 0.95, color: P.ink,
      dry: 0.92, speed: 460, delay: 150, bleedP: 0.006
    }];
  }

  function interludeComposer(w, h, rng, season) {
    /* one seasonal mark, fallen into the emptiness below the poem —
       the room keeps one scroll and one flower; the page keeps one dab */
    const P = SEASONS[season].paint;
    const mob = w < 700;
    const x = w * (mob ? 0.78 : 0.84) + rng() * w * 0.04;
    const y = h * 0.74 + rng() * h * 0.08;
    const len = 13 + rng() * 6;
    return [{
      pts: [{ x: x, y: y }, { x: x + len * 0.7, y: y + len * (0.4 + rng() * 0.3) }],
      width: 13 + rng() * 4, ink: 0.55 + rng() * 0.15, color: P.bloom, dab: true,
      dry: 0.4, speed: 260, delay: 600, bleedP: 0.05, bristles: 7
    }];
  }

  function footerSealComposer(w, h, rng, season) {
    const P = SEASONS[season].paint;
    return [{
      type: 'seal', x: w / 2, y: h / 2, size: Math.min(w, h) * 0.88,
      rot: -0.05, glyph: '清', color: P.deep, paper: '#F5F1E6', delay: 250
    }];
  }

  /* ================= painters ================= */

  const painters = [];
  const canvasToPainter = new Map();

  function addPainter(canvas, composer, seedBase) {
    const p = new SumiPainter(canvas, composer, { seedBase: seedBase });
    p.instant = mqReduced.matches;
    painters.push(p);
    canvasToPainter.set(canvas, p);
    return p;
  }

  const heroCanvas = document.getElementById('heroInk');
  if (heroCanvas) addPainter(heroCanvas, heroComposer, 11);

  document.querySelectorAll('.divider canvas').forEach(function (c, i) {
    addPainter(c, dividerComposer, 41 + i * 17);
  });

  let ensoPainter = null;
  const ensoCanvas = document.getElementById('ensoInk');
  if (ensoCanvas) ensoPainter = addPainter(ensoCanvas, ensoComposer, 271);

  const haikuCanvas = document.getElementById('haikuInk');
  if (haikuCanvas) addPainter(haikuCanvas, interludeComposer, 173);

  const footSealCanvas = document.getElementById('footSeal');
  if (footSealCanvas) addPainter(footSealCanvas, footerSealComposer, 311);

  /* paint when seen; rest when unseen */
  const inViewSet = new Set();
  const paintObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      const p = canvasToPainter.get(en.target);
      if (!p) return;
      p.setInView(en.isIntersecting);
      if (en.isIntersecting) { inViewSet.add(en.target); p.play(); }
      else inViewSet.delete(en.target);
    });
  }, { rootMargin: '60px 0px 60px 0px', threshold: 0.02 });
  painters.forEach(function (p) { paintObs.observe(p.canvas); });

  document.addEventListener('visibilitychange', function () {
    const v = !document.hidden;
    painters.forEach(function (p) { p.setPageVisible(v); });
  });

  const onMotionPref = function () {
    painters.forEach(function (p) { p.instant = mqReduced.matches; });
  };
  if (mqReduced.addEventListener) mqReduced.addEventListener('change', onMotionPref);
  else if (mqReduced.addListener) mqReduced.addListener(onMotionPref);

  /* refit paintings on real resizes (not address-bar jitters) */
  let lastW = window.innerWidth, lastH = window.innerHeight, resizeT = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      const dw = Math.abs(window.innerWidth - lastW);
      const dh = Math.abs(window.innerHeight - lastH);
      if (dw < 24 && dh < 140) return;
      lastW = window.innerWidth; lastH = window.innerHeight;
      painters.forEach(function (p) { p.resize(); });
    }, 220);
  });

  /* ================= season switching ================= */

  const seasonButtons = Array.prototype.slice.call(document.querySelectorAll('.season-btn'));
  const heroSeasonEl = document.getElementById('heroSeason');
  const haikuJpEl = document.getElementById('haikuJp');
  const haikuRomajiEl = document.getElementById('haikuRomaji');
  const haikuEnEl = document.getElementById('haikuEn');
  const haikuCiteEl = document.getElementById('haikuCite');
  const wagashiListEl = document.getElementById('wagashiList');
  const seasonStatusEl = document.getElementById('seasonStatus');
  const swapEls = Array.prototype.slice.call(document.querySelectorAll('[data-swap]'));

  /* the poem writes itself — column by column, right to left,
     when the interlude is first seen and again after each season */
  const haikuSection = document.getElementById('haiku');
  let haikuInView = false;
  let haikuWritten = false;

  function writeHaiku() {
    if (!haikuJpEl) return;
    haikuJpEl.classList.remove('is-writing');
    void haikuJpEl.offsetWidth; /* restart the wipe */
    haikuJpEl.classList.add('is-writing');
    haikuWritten = true;
  }
  function resetHaiku() {
    haikuWritten = false;
    if (haikuJpEl) haikuJpEl.classList.remove('is-writing');
    if (haikuInView) writeHaiku();
  }
  if (haikuSection && haikuJpEl) {
    haikuJpEl.classList.add('will-write');
    const haikuObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        haikuInView = en.isIntersecting;
        if (en.isIntersecting && !haikuWritten) writeHaiku();
      });
    }, { threshold: 0.3 });
    haikuObs.observe(haikuSection);
  }

  function renderWagashi(s) {
    if (!wagashiListEl) return;
    wagashiListEl.textContent = '';
    SEASONS[s].wagashi.forEach(function (it) {
      const li = document.createElement('li');
      li.className = 'wagashi-item';
      const head = document.createElement('div');
      head.className = 'wagashi-head';
      const jp = document.createElement('span');
      jp.className = 'wagashi-jp'; jp.lang = 'ja'; jp.textContent = it.jp;
      const nm = document.createElement('span');
      nm.className = 'wagashi-name'; nm.textContent = it.name;
      const pr = document.createElement('span');
      pr.className = 'wagashi-price'; pr.textContent = it.price;
      head.appendChild(jp); head.appendChild(nm); head.appendChild(pr);
      const de = document.createElement('p');
      de.className = 'wagashi-desc'; de.textContent = it.desc;
      li.appendChild(head); li.appendChild(de);
      wagashiListEl.appendChild(li);
    });
  }

  function renderTexts(s) {
    const D = SEASONS[s];
    if (heroSeasonEl) heroSeasonEl.textContent = D.heroLine;
    if (haikuJpEl) {
      haikuJpEl.textContent = '';
      D.haiku.jp.forEach(function (line) {
        const sp = document.createElement('span');
        sp.className = 'haiku-line';
        sp.textContent = line;
        haikuJpEl.appendChild(sp);
      });
    }
    if (haikuRomajiEl) haikuRomajiEl.textContent = D.haiku.romaji;
    if (haikuEnEl) haikuEnEl.textContent = D.haiku.en;
    if (haikuCiteEl) haikuCiteEl.textContent = '— ' + D.haiku.cite;
    renderWagashi(s);
  }

  function updateButtons(s) {
    seasonButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.s === s ? 'true' : 'false');
    });
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));

  let current = null;
  let switching = false;

  const THEME_WASH = { spring: '#F2E6E2', summer: '#E9ECDE', autumn: '#F3E7D7', winter: '#E8EBE9' };
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  async function setSeason(s, initial) {
    if (!SEASONS[s] || s === current || switching) return;
    current = s;
    root.dataset.season = s;
    updateButtons(s);
    if (themeMeta) themeMeta.setAttribute('content', THEME_WASH[s] || '#F5F1E6');
    try { localStorage.setItem('seifuan-season', s); } catch (e) { /* private mode */ }
    if (seasonStatusEl) seasonStatusEl.textContent = 'Season set to ' + SEASONS[s].en.toLowerCase() + '.';

    if (initial || mqReduced.matches) {
      renderTexts(s);
      resetHaiku();
      painters.forEach(function (p) { p.setSeason(s); });
      inViewSet.forEach(function (c) {
        const p = canvasToPainter.get(c);
        if (p) p.play();
      });
      return;
    }

    switching = true;
    swapEls.forEach(function (el, i) {
      el.style.transitionDelay = (i * 40) + 'ms';
      el.classList.add('swap-out');
    });
    painters.forEach(function (p) { p.canvas.classList.add('ink-fade'); });
    await wait(520);
    renderTexts(s);
    resetHaiku();
    painters.forEach(function (p) { p.setSeason(s); });
    swapEls.forEach(function (el) {
      el.classList.remove('swap-out');
      setTimeout(function () { el.style.transitionDelay = ''; }, 700);
    });
    painters.forEach(function (p) { p.canvas.classList.remove('ink-fade'); });
    inViewSet.forEach(function (c) {
      const p = canvasToPainter.get(c);
      if (p) p.play();
    });
    switching = false;
  }

  seasonButtons.forEach(function (b) {
    b.addEventListener('click', function () { setSeason(b.dataset.s, false); });
  });

  /* initial season: saved choice, else the actual month */
  let initialSeason = null;
  try { initialSeason = localStorage.getItem('seifuan-season'); } catch (e) { /* fine */ }
  if (!SEASONS[initialSeason]) initialSeason = seasonForMonth(new Date().getMonth());
  setSeason(initialSeason, true);

  /* ================= scroll reveals ================= */

  const revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        revealObs.unobserve(en.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
  document.querySelectorAll('[data-reveal]').forEach(function (el) { revealObs.observe(el); });

  /* ================= reservations ================= */

  const form = document.getElementById('reserveForm');
  const done = document.getElementById('reserveDone');
  const doneText = document.getElementById('reserveDoneText');

  const SEATING_NAMES = {
    asa: 'Asa-cha — morning tea at 06:30',
    chaji: 'Shōgo no chaji — the full ceremony at 11:00',
    yoi1: 'Yoi no chakai — evening tea at 17:00',
    yoi2: 'Yoi no chakai — evening tea at 18:45'
  };
  const GUEST_WORDS = ['', 'one guest', 'two guests', 'three guests', 'four guests'];

  if (form && done) {
    const dateInput = form.querySelector('#f-date');
    if (dateInput) {
      const today = new Date();
      const pad = n => String(n).padStart(2, '0');
      dateInput.min = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
    }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const name = (fd.get('name') || '').toString().trim();
      const seating = SEATING_NAMES[fd.get('seating')] || 'your seating';
      const guests = GUEST_WORDS[parseInt(fd.get('guests'), 10)] || 'your party';
      let dateTxt = '';
      const raw = (fd.get('date') || '').toString();
      if (raw) {
        const d = new Date(raw + 'T12:00:00');
        if (!isNaN(d)) dateTxt = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      doneText.textContent =
        'Thank you, ' + (name || 'friend') + '. ' + seating +
        (dateTxt ? ' on ' + dateTxt : '') + ', ' + guests +
        '. We answer within two days at the address you gave; if the date is already held, we offer the nearest seating that is free.';
      form.hidden = true;
      done.hidden = false;
      if (ensoPainter) {
        requestAnimationFrame(function () {
          setTimeout(function () { ensoPainter.play(); }, 250);
        });
      }
      done.scrollIntoView({ behavior: mqReduced.matches ? 'auto' : 'smooth', block: 'center' });
    });
  }

  /* internal handle for design iteration (harmless in production) */
  window.__seifuan = { painters: painters, setSeason: setSeason, SEASONS: SEASONS };

})();
