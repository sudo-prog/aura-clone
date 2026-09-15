/* weave.js — draft model, presets, and the thread-scale cloth painter.
   A draft is the weaver's program: threading (which shaft holds each warp
   end), tie-up (which shafts each treadle lifts), treadling (which treadle
   fires on each pick). warpUp() is the whole loom in one line. */

export const SHAFTS = 8;
export const TREADLES = 8;
export const ENDS = 24; // editor columns

export function expand(pattern, len) {
  const out = new Array(len);
  for (let i = 0; i < len; i++) out[i] = pattern[i % pattern.length];
  return out;
}

function tieupOf(cols) {
  // cols: per-treadle arrays of lifted shafts
  const t = Array.from({ length: TREADLES }, () => new Array(SHAFTS).fill(false));
  cols.forEach((shafts, ti) => shafts.forEach((s) => (t[ti][s] = true)));
  return t;
}

const TWILL_TIEUP = tieupOf([[0, 1], [1, 2], [2, 3], [3, 0]]);

export const PRESETS = {
  plain: {
    key: 'plain',
    name: 'plain weave',
    threading: expand([0, 1], ENDS),
    treadling: expand([0, 1], 16),
    tieup: tieupOf([[0], [1]]),
  },
  twill: {
    key: 'twill',
    name: '2/2 twill',
    threading: expand([0, 1, 2, 3], ENDS),
    treadling: expand([0, 1, 2, 3], 16),
    tieup: TWILL_TIEUP,
  },
  satin: {
    key: 'satin',
    name: '8-end satin',
    threading: expand([0, 1, 2, 3, 4, 5, 6, 7], ENDS),
    treadling: expand([0, 1, 2, 3, 4, 5, 6, 7], 16),
    // weft sateen: one shaft up per pick, counter of three — long madder floats
    tieup: tieupOf(Array.from({ length: 8 }, (_, t) => [(t * 3) % 8])),
  },
  herringbone: {
    key: 'herringbone',
    name: 'herringbone',
    threading: expand([0, 1, 2, 3, 0, 1, 3, 2, 1, 0, 3, 2], ENDS),
    treadling: expand([0, 1, 2, 3], 16),
    tieup: TWILL_TIEUP,
  },
  gooseeye: {
    key: 'gooseeye',
    name: 'goose-eye',
    threading: expand([0, 1, 2, 3, 2, 1], ENDS),
    treadling: expand([0, 1, 2, 3, 2, 1], 12),
    tieup: TWILL_TIEUP,
  },
};

export function cloneDraft(d, name) {
  return {
    key: 'yours',
    name: name || d.name,
    threading: d.threading.slice(),
    treadling: d.treadling.slice(),
    tieup: d.tieup.map((r) => r.slice()),
  };
}

export function warpUp(draft, end, pick) {
  const t = draft.treadling[((pick % draft.treadling.length) + draft.treadling.length) % draft.treadling.length];
  const s = draft.threading[end % draft.threading.length];
  return draft.tieup[t][s];
}

export function liftedShafts(draft, pick) {
  const t = draft.treadling[pick % draft.treadling.length];
  return draft.tieup[t];
}

/* ---------------- thread colors & styles ---------------- */

export const THREAD_COLORS = {
  indigo: '#26406C',
  madder: '#A63D2F',
  walnut: '#5A4028',
  wool: '#EDE3C8',
  flax: '#B9A67E',
};

export const COLOR_NAMES = {
  indigo: 'indigo',
  madder: 'madder',
  walnut: 'walnut',
  wool: 'undyed wool',
  flax: 'flax',
};

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function css([r, g, b]) {
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function mix(rgb, target, k) {
  return rgb.map((c, i) => c + (target[i] - c) * k);
}

/* A thread style: base plus lit/shaded flanks for the cylinder gradient. */
export function threadStyle(hex, jitter = 0) {
  let rgb = hexRgb(hex);
  if (jitter) rgb = mix(rgb, jitter > 0 ? [255, 250, 235] : [20, 12, 6], Math.abs(jitter));
  return {
    base: css(rgb),
    light: css(mix(rgb, [255, 250, 235], 0.38)),
    dark: css(mix(rgb, [22, 14, 8], 0.42)),
    deep: css(mix(rgb, [12, 8, 5], 0.62)),
  };
}

/* Per-end styles with slight fiber variation so the warp reads as thread,
   not vector fill. Deterministic per index (seeded) so re-renders match. */
export function warpStyles(hex, count, seed = 7) {
  const out = new Array(count);
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 16807) % 2147483647;
    const j = ((s / 2147483647) - 0.5) * 0.14;
    out[i] = threadStyle(hex, j);
  }
  return out;
}

export function weftStyleFor(hex, pick, seed = 3) {
  let s = (seed + pick * 2654435761) % 2147483647;
  if (s < 0) s += 2147483647;
  const j = ((s / 2147483647) - 0.5) * 0.12;
  return threadStyle(hex, j);
}

/* ---------------- the row painter ----------------
   Draws one pick of cloth: the weft band woven through this row's warp.
   ups[i] true = warp end i lifted = warp passes OVER the weft.
   Order: sunken warps, weft (shadowed), raised warps (shadowed). */
export function drawWeaveRow(ctx, o) {
  const { y, pitch, ends, ups, warp, weft, x0 = 0 } = o;
  const ww = pitch * 0.72;
  const wh = pitch * 0.8;
  const yc = y + pitch / 2;

  // 1 — warps diving under: darker, in the weft's shadow
  for (let i = 0; i < ends; i++) {
    if (ups[i]) continue;
    const x = x0 + i * pitch + (pitch - ww) / 2;
    const g = ctx.createLinearGradient(x, 0, x + ww, 0);
    g.addColorStop(0, warp[i].deep);
    g.addColorStop(0.5, warp[i].dark);
    g.addColorStop(1, warp[i].deep);
    ctx.fillStyle = g;
    ctx.fillRect(x, y - 0.5, ww, pitch + 1);
  }

  // 2 — the weft band, continuous across the row
  ctx.save();
  ctx.shadowColor = 'rgba(18,10,5,0.55)';
  ctx.shadowBlur = pitch * 0.45;
  ctx.shadowOffsetY = pitch * 0.1;
  const wg = ctx.createLinearGradient(0, yc - wh / 2, 0, yc + wh / 2);
  wg.addColorStop(0, weft.dark);
  wg.addColorStop(0.42, weft.light);
  wg.addColorStop(1, weft.dark);
  ctx.fillStyle = wg;
  ctx.fillRect(x0, yc - wh / 2, ends * pitch, wh);
  ctx.restore();

  // 3 — raised warps riding over the weft
  ctx.save();
  ctx.shadowColor = 'rgba(18,10,5,0.5)';
  ctx.shadowBlur = pitch * 0.4;
  ctx.shadowOffsetY = 0;
  for (let i = 0; i < ends; i++) {
    if (!ups[i]) continue;
    const x = x0 + i * pitch + (pitch - ww) / 2;
    const g = ctx.createLinearGradient(x, 0, x + ww, 0);
    g.addColorStop(0, warp[i].dark);
    g.addColorStop(0.5, warp[i].light);
    g.addColorStop(1, warp[i].dark);
    ctx.fillStyle = g;
    ctx.fillRect(x, y - 0.5, ww, pitch + 1);
  }
  ctx.restore();
}

/* Full static drawdown/swatch render. */
export function renderCloth(ctx, draft, o) {
  const { pitch, ends, picks, warpHex, weftHex, x0 = 0, y0 = 0, pickOffset = 0 } = o;
  const warp = o.warp || warpStyles(warpHex, ends);
  for (let p = 0; p < picks; p++) {
    const ups = new Array(ends);
    for (let i = 0; i < ends; i++) ups[i] = warpUp(draft, i, p + pickOffset);
    drawWeaveRow(ctx, {
      y: y0 + p * pitch,
      pitch, ends, ups, warp,
      weft: weftStyleFor(weftHex, p + pickOffset),
      x0,
    });
  }
}
