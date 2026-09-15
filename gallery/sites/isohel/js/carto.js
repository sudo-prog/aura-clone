/* Shared cartographic rendering: hypsometric ramp, contours, hillshade,
   canvas tint painting, hachures, shaded relief. Relies on global d3. */

/* hypsometric stops: valley green -> ochre -> bare rock -> snow */
const RAMP = [
  [0.0, [0x9f, 0xb2, 0x87]],
  [0.22, [0xb7, 0xba, 0x83]],
  [0.42, [0xd0, 0xbe, 0x78]],
  [0.6, [0xc2, 0xa4, 0x70]],
  [0.78, [0xd9, 0xcd, 0xb2]],
  [0.9, [0xec, 0xe5, 0xd3]],
  [1.0, [0xf7, 0xf3, 0xe7]],
];

export function rampColor(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0]) {
      const [t0, c0] = RAMP[i - 1];
      const [t1, c1] = RAMP[i];
      const k = (t - t0) / (t1 - t0 || 1);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * k);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * k);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * k);
      return `rgb(${r},${g},${b})`;
    }
  }
  return "rgb(247,243,231)";
}

export function thresholdsFor(n = 25, lo = 0.04, hi = 0.97) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(lo + (i / (n - 1)) * (hi - lo));
  return out;
}

export function contoursOf(field, w, h, thresholds) {
  return d3.contours().size([w, h]).thresholds(thresholds)(field);
}

/* geoPath serializer scaled from grid space into pixel space */
export function makePath(sx, sy) {
  const t = d3.geoTransform({
    point(x, y) { this.stream.point(x * sx, y * sy); },
  });
  return d3.geoPath(t);
}

/* Hillshade to a small offscreen canvas (grid resolution).
   az/alt in degrees. Returns canvas w×h. */
export function hillshadeCanvas(field, w, h, opts = {}) {
  const az = ((opts.az ?? 315) - 90) * Math.PI / 180;
  const alt = (opts.alt ?? 45) * Math.PI / 180;
  const zScale = opts.z ?? 26;
  const off = opts.canvas || document.createElement("canvas");
  off.width = w; off.height = h;
  const ctx = off.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const lx = Math.cos(alt) * Math.cos(az);
  const ly = Math.cos(alt) * Math.sin(az);
  const lz = Math.sin(alt);
  const shadow = opts.shadow || [59, 42, 24];
  const light = opts.light || [255, 250, 235];
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - 1) * w, y1 = Math.min(h - 1, y + 1) * w;
    const ey = Math.min(1, Math.min(y, h - 1 - y) / 2.5); // fade at plate rim
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - 1), x1 = Math.min(w - 1, x + 1);
      const edge = Math.min(ey, Math.min(1, Math.min(x, w - 1 - x) / 2.5));
      const dzdx = (field[y * w + x1] - field[y * w + x0]) * zScale * 0.5;
      const dzdy = (field[y1 + x] - field[y0 + x]) * zScale * 0.5;
      const len = Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1);
      let s = (-dzdx * lx - dzdy * ly + lz) / len; // 0..1
      s = Math.max(0, Math.min(1, s));
      const i = (y * w + x) * 4;
      if (s < 0.62) {
        const a = (0.62 - s) / 0.62 * edge;
        d[i] = shadow[0]; d[i + 1] = shadow[1]; d[i + 2] = shadow[2];
        d[i + 3] = Math.round(a * (opts.shadowAlpha ?? 150));
      } else if (s > 0.8) {
        const a = (s - 0.8) / 0.2 * edge;
        d[i] = light[0]; d[i + 1] = light[1]; d[i + 2] = light[2];
        d[i + 3] = Math.round(a * (opts.lightAlpha ?? 90));
      } else {
        d[i + 3] = 0;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return off;
}

/* Paint hypsometric fills + hillshade into ctx within rect (x,y,W,H). */
export function paintTints(ctx, terrain, rect, opts = {}) {
  const { w, h, field } = terrain;
  const [X, Y, W, H] = rect;
  const sx = W / (w - 1), sy = H / (h - 1);
  const bands = opts.bands || thresholdsFor(opts.nBands ?? 25);
  const cts = contoursOf(field, w, h, bands);
  ctx.save();
  ctx.beginPath();
  ctx.rect(X, Y, W, H);
  ctx.clip();
  ctx.globalAlpha = opts.tintAlpha ?? 0.6;
  ctx.fillStyle = rampColor(0);
  ctx.fillRect(X, Y, W, H);
  ctx.translate(X, Y);
  const path = d3.geoPath(d3.geoTransform({
    point(px, py) { this.stream.point(px * sx, py * sy); },
  }), ctx);
  for (let i = 0; i < cts.length; i++) {
    ctx.fillStyle = rampColor(cts[i].value);
    ctx.beginPath();
    path(cts[i]);
    ctx.fill();
  }
  ctx.globalAlpha = opts.shadeAlpha ?? 0.55;
  const shade = hillshadeCanvas(field, w, h, opts.shade || {});
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(shade, -sx / 2, -sy / 2, W + sx, H + sy);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/* Draw contour strokes straight onto a canvas (for thumbnails). */
export function strokeContours(ctx, terrain, rect, opts = {}) {
  const { w, h, field } = terrain;
  const [X, Y, W, H] = rect;
  const sx = W / (w - 1), sy = H / (h - 1);
  const bands = opts.bands || thresholdsFor(opts.nBands ?? 18);
  const cts = contoursOf(field, w, h, bands);
  ctx.save();
  ctx.beginPath(); ctx.rect(X, Y, W, H); ctx.clip();
  ctx.translate(X, Y);
  const path = d3.geoPath(d3.geoTransform({
    point(px, py) { this.stream.point(px * sx, py * sy); },
  }), ctx);
  cts.forEach((c, i) => {
    const isIndex = i % (opts.indexEvery ?? 5) === (opts.indexPhase ?? 0);
    ctx.strokeStyle = opts.color || "#6b4f2e";
    ctx.globalAlpha = isIndex ? (opts.indexAlpha ?? 0.85) : (opts.lineAlpha ?? 0.42);
    ctx.lineWidth = isIndex ? (opts.indexWidth ?? 1.1) : (opts.lineWidth ?? 0.55);
    ctx.beginPath(); path(c); ctx.stroke();
  });
  ctx.restore();
  ctx.globalAlpha = 1;
}

/* Lehmann-style hachures: strokes seeded along contour rings, running
   downslope, weight proportional to slope. One-time render. */
export function paintHachures(ctx, terrain, rect, opts = {}) {
  const { w, h, field } = terrain;
  const [X, Y, W, H] = rect;
  const sx = W / (w - 1), sy = H / (h - 1);
  const levels = thresholdsFor(opts.levels ?? 26, 0.05, 0.96);
  const cts = contoursOf(field, w, h, levels);
  ctx.save();
  ctx.beginPath(); ctx.rect(X, Y, W, H); ctx.clip();
  ctx.translate(X, Y);
  ctx.strokeStyle = opts.color || "#5e4527";
  ctx.lineCap = "round";
  const spacing = opts.spacing ?? 7.5;
  for (const c of cts) {
    for (const poly of c.coordinates) {
      for (const ring of poly) {
        let acc = 0;
        for (let i = 1; i < ring.length; i++) {
          const [ax, ay] = ring[i - 1];
          const [bx, by] = ring[i];
          const seg = Math.hypot((bx - ax) * sx, (by - ay) * sy);
          acc += seg;
          if (acc < spacing) continue;
          acc = 0;
          const gx = (ax + bx) / 2, gy = (ay + by) / 2;
          const [dzx, dzy] = terrain.gradient(gx, gy);
          const m = Math.hypot(dzx, dzy);
          if (m < 0.006) continue;
          // downhill unit vector in px space
          const ux = (-dzx / m), uy = (-dzy / m);
          const slope = Math.min(1, m * (opts.slopeGain ?? 16));
          const len = (opts.lenMin ?? 3.5) + slope * (opts.lenMax ?? 9);
          const px = gx * sx, py = gy * sy;
          ctx.globalAlpha = 0.25 + slope * 0.6;
          ctx.lineWidth = 0.4 + slope * (opts.weight ?? 1.5);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + ux * len, py + uy * len);
          ctx.stroke();
        }
      }
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/* Continuous-tone shaded relief in sepia, Imhof-style fill light.
   Supersampled from the bilinear surface so the plate prints crisp. */
export function paintRelief(ctx, terrain, rect, opts = {}) {
  const { w, h } = terrain;
  const [X, Y, W, H] = rect;
  const up = opts.upscale ?? 4;
  const RW = Math.min(1400, Math.round(w * up));
  const RH = Math.min(1000, Math.round(h * up));
  const off = document.createElement("canvas");
  off.width = RW; off.height = RH;
  const octx = off.getContext("2d");
  const img = octx.createImageData(RW, RH);
  const d = img.data;
  const zScale = opts.z ?? 26;
  const mk = (azd, altd) => {
    const az = (azd - 90) * Math.PI / 180, alt = altd * Math.PI / 180;
    return [Math.cos(alt) * Math.cos(az), Math.cos(alt) * Math.sin(az), Math.sin(alt)];
  };
  const L1 = mk(315, 42), L2 = mk(135, 30);
  // paper -> deep sepia
  const hi = [246, 240, 226], lo = [84, 63, 38];
  const st = 0.7; // gradient stencil in cells
  for (let y = 0; y < RH; y++) {
    const gy = y / (RH - 1) * (h - 1);
    for (let x = 0; x < RW; x++) {
      const gx = x / (RW - 1) * (w - 1);
      const dzdx = (terrain.sample(gx + st, gy) - terrain.sample(gx - st, gy)) / (2 * st) * zScale;
      const dzdy = (terrain.sample(gx, gy + st) - terrain.sample(gx, gy - st)) / (2 * st) * zScale;
      const len = Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1);
      const dot = (L) => Math.max(0, (-dzdx * L[0] - dzdy * L[1] + L[2]) / len);
      let s = dot(L1) * 0.85 + dot(L2) * 0.25;
      s = Math.pow(Math.min(1, s), 1.25);
      // aerial perspective: high ground slightly lighter
      const e = terrain.sample(gx, gy);
      s = Math.min(1, s * (0.82 + e * 0.35));
      // lift the deepest shadow off pure dark, and rest the rim on paper
      s = 0.1 + 0.9 * s;
      const edge = Math.min(1, Math.min(Math.min(gx, w - 1 - gx), Math.min(gy, h - 1 - gy)) / 2.5);
      s = s + (1 - edge) * (1 - s) * 0.85;
      const i = (y * RW + x) * 4;
      d[i] = Math.round(lo[0] + (hi[0] - lo[0]) * s);
      d[i + 1] = Math.round(lo[1] + (hi[1] - lo[1]) * s);
      d[i + 2] = Math.round(lo[2] + (hi[2] - lo[2]) * s);
      d[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  ctx.save();
  ctx.beginPath(); ctx.rect(X, Y, W, H); ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(off, X, Y, W, H);
  ctx.restore();
}

export const SVGNS = "http://www.w3.org/2000/svg";
export function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
