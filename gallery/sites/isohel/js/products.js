/* PLATE IV — sheet catalogue thumbnails: each sheet is its own seeded
   terrain, drawn small: tints, whisper of shade, contour linework. */

import { Terrain } from "./terrain.js";
import { paintTints, strokeContours, thresholdsFor } from "./carto.js";

const GW = 88, GH = 58;

function renderThumb(canvas) {
  const seed = Number(canvas.dataset.seed) || 7;
  const water = canvas.dataset.water !== undefined;
  const W = 640, H = 416;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const terrain = new Terrain(GW, GH, seed);

  const bands = thresholdsFor(18, 0.05, 0.96);
  paintTints(ctx, terrain, [0, 0, W, H], {
    bands, tintAlpha: 0.55, shadeAlpha: 0.45,
    shade: { z: 20, shadowAlpha: 120, lightAlpha: 70 },
  });

  if (water) {
    // flood the lowlands: everything under the waterline becomes the sound
    const sx = W / (GW - 1), sy = H / (GH - 1);
    const level = 0.16;
    const cts = d3.contours().size([GW, GH]).thresholds([level])(terrain.field);
    const path = d3.geoPath(d3.geoTransform({
      point(px, py) { this.stream.point(px * sx, py * sy); },
    }), ctx);
    // water = full rect minus land-above-level
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    path(cts[0]); // above-level region
    ctx.clip("evenodd");
    ctx.fillStyle = "rgba(159, 178, 165, 0.5)";
    ctx.fillRect(0, 0, W, H);
    // ripple lines
    ctx.strokeStyle = "rgba(79, 93, 69, 0.35)";
    ctx.lineWidth = 0.8;
    for (let y = 6; y < H; y += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + y) * 1.4);
      ctx.stroke();
    }
    ctx.restore();
    // shoreline
    ctx.save();
    ctx.strokeStyle = "rgba(56, 46, 31, 0.85)";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); path(cts[0]); ctx.stroke();
    ctx.restore();
  }

  strokeContours(ctx, terrain, [0, 0, W, H], {
    bands, indexEvery: 4, lineWidth: 0.65, indexWidth: 1.25,
    lineAlpha: 0.4, indexAlpha: 0.8,
  });
}

export function initProducts() {
  const canvases = document.querySelectorAll(".sheet-thumb canvas");
  if (!canvases.length || !window.d3) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        renderThumb(e.target);
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: "300px" });
  canvases.forEach((c) => io.observe(c));
}
