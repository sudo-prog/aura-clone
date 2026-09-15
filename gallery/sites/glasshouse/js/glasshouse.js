/* ============================================================
   glasshouse.js — builds the SVG Palm House elevation.
   White ironwork over celadon panes; every iron path carries
   pathLength=1 so CSS can self-draw it on load.
   Returns vine guides (mullion coordinates) for the canvas
   garden to climb.
   ============================================================ */

const NS = 'http://www.w3.org/2000/svg';
export const STAGE_W = 1200, STAGE_H = 640;

function el(name, attrs = {}) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

/* geometry constants */
const G = 598;                 /* ground line */
const HALL_L = 400, HALL_R = 800, SPRING = 300, APEX = 128;
const RX = (HALL_R - HALL_L) / 2, RY = SPRING - APEX, CX = 600;
const WING_L_OUT = 155, WING_R_OUT = 1045;
const WING_WALL_TOP = 432, WING_ROOF_INNER = 348;

export function buildPalmhouse(container) {
  const svg = el('svg', { viewBox: `0 0 ${STAGE_W} ${STAGE_H}`, fill: 'none', 'aria-hidden': 'true' });

  const panes = el('g');          /* glass fills, behind iron */
  const shadow = el('g');         /* dark offset — embossing so white iron reads */
  const iron = el('g');           /* white ironwork */
  svg.appendChild(panes); svg.appendChild(shadow); svg.appendChild(iron);

  let ironIdx = 0;
  function ironPath(d, w, opts = {}) {
    const sh = el('path', {
      d, stroke: 'rgba(32,57,43,0.34)', 'stroke-width': w + 0.6,
      'stroke-linecap': 'round', transform: 'translate(0.8 1.6)',
      pathLength: '1', class: 'iron',
    });
    const p = el('path', {
      d, stroke: '#FCFDF9', 'stroke-width': w,
      'stroke-linecap': 'round', pathLength: '1', class: 'iron',
    });
    const delay = (0.06 + (opts.delay ?? ironIdx * 0.018)).toFixed(3);
    sh.style.transitionDelay = delay + 's';
    p.style.transitionDelay = delay + 's';
    shadow.appendChild(sh); iron.appendChild(p);
    ironIdx++;
    return p;
  }
  /* alpha is baked into the fill (CSS animates .pane opacity 0→1 on load) */
  function hexA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  function pane(d, fill, alpha) {
    panes.appendChild(el('path', { d, fill: hexA(fill, alpha), class: 'pane' }));
  }

  const rand = (() => { let s = 42; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const glassTints = ['#D6E4D5', '#CFE0CE', '#DCE8D6', '#E7E4C8'];
  function cellFill(x0, y0, x1, y1) {
    const warm = rand() < 0.16;
    const tint = warm ? '#EFE6C4' : glassTints[Math.floor(rand() * 3)];
    pane(`M${x0.toFixed(1)} ${y0.toFixed(1)} H${x1.toFixed(1)} V${y1.toFixed(1)} H${x0.toFixed(1)} Z`, tint, 0.28 + rand() * 0.38);
  }
  function quadY(y0, cy_, y1, t) {
    const mt = 1 - t;
    return mt * mt * y0 + 2 * mt * t * cy_ + t * t * y1;
  }

  /* ---------- glass panes ---------- */
  /* central hall walls: grid 11 cols x 4 rows */
  const cols = 11, colW = (HALL_R - HALL_L) / cols;
  const rowsY = [SPRING, 380, 458, 530, G];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rowsY.length - 1; r++) {
      /* leave a doorway gap */
      const x0 = HALL_L + c * colW;
      if (r >= 1 && c >= 5 && c <= 5) continue;
      cellFill(x0, rowsY[r], x0 + colW, rowsY[r + 1]);
    }
  }
  /* fan glass: wedge sectors under the arch */
  const spokes = 12;
  for (let sIdx = 0; sIdx < spokes; sIdx++) {
    const a0 = Math.PI - (sIdx / spokes) * Math.PI;
    const a1 = Math.PI - ((sIdx + 1) / spokes) * Math.PI;
    const p0 = [CX + RX * Math.cos(a0), SPRING - RY * Math.sin(a0)];
    const p1 = [CX + RX * Math.cos(a1), SPRING - RY * Math.sin(a1)];
    const warm = rand() < 0.25;
    pane(`M${CX} ${SPRING} L${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${RX} ${RY} 0 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} Z`,
      warm ? '#EFE6C4' : glassTints[Math.floor(rand() * 3)], 0.26 + rand() * 0.3);
  }
  /* wings — xOut is the outer (low) wall, xIn joins the hall (high) */
  function wingPanes(xOut, xIn) {
    const wCols = 7, cw = (xIn - xOut) / wCols;
    const mx = (xOut + xIn) / 2, my = (WING_WALL_TOP + WING_ROOF_INNER) / 2 - 8;
    void mx;
    for (let c = 0; c < wCols; c++) {
      const x0 = xOut + c * cw, x1 = x0 + cw;
      const roofY = quadY(WING_WALL_TOP, my, WING_ROOF_INNER, (c + 0.6) / wCols);
      const ys = [roofY, 476, 538, G];
      for (let r = 0; r < ys.length - 1; r++) {
        cellFill(Math.min(x0, x1), ys[r], Math.max(x0, x1), ys[r + 1]);
      }
    }
  }
  wingPanes(WING_L_OUT, HALL_L);
  wingPanes(WING_R_OUT, HALL_R);

  /* ---------- ironwork ---------- */
  /* ground / plinth */
  ironPath(`M120 ${G} H1080`, 3.4, { delay: 0 });
  ironPath(`M120 ${G + 12} H1080`, 1.6, { delay: 0.05 });

  /* central hall structure */
  ironPath(`M${HALL_L} ${G} V${SPRING}`, 3);
  ironPath(`M${HALL_R} ${G} V${SPRING}`, 3);
  ironPath(`M${HALL_L} ${SPRING} A${RX} ${RY} 0 0 1 ${HALL_R} ${SPRING}`, 3.4);
  ironPath(`M${HALL_L} ${SPRING} H${HALL_R}`, 2.2);

  /* fanlight spokes + inner arch */
  for (let sIdx = 1; sIdx < spokes; sIdx++) {
    const a = Math.PI - (sIdx / spokes) * Math.PI;
    const px = CX + RX * Math.cos(a), py = SPRING - RY * Math.sin(a);
    ironPath(`M${CX} ${SPRING} L${px.toFixed(1)} ${py.toFixed(1)}`, 1.5);
  }
  const IRX = RX * 0.58, IRY = RY * 0.58;
  ironPath(`M${CX - IRX} ${SPRING} A${IRX} ${IRY} 0 0 1 ${CX + IRX} ${SPRING}`, 1.8);
  const HRX = RX * 0.22, HRY = RY * 0.22;
  ironPath(`M${CX - HRX} ${SPRING} A${HRX} ${HRY} 0 0 1 ${CX + HRX} ${SPRING}`, 1.4);

  /* hall mullions + transoms */
  for (let c = 1; c < cols; c++) {
    const x = HALL_L + c * colW;
    ironPath(`M${x.toFixed(1)} ${G} V${SPRING}`, c === Math.ceil(cols / 2) ? 2 : 1.4);
  }
  for (const y of [380, 458, 530]) ironPath(`M${HALL_L} ${y} H${HALL_R}`, 1.3);

  /* door — center bay */
  const doorL = HALL_L + 5 * colW, doorR = HALL_L + 6 * colW;
  ironPath(`M${doorL + 4} ${G} V400 A${(doorR - doorL) / 2 - 4} 30 0 0 1 ${doorR - 4} 400 V${G}`, 2.2);
  ironPath(`M${(doorL + doorR) / 2} ${G} V386`, 1.4);

  /* finial: mast, ball, spike */
  ironPath(`M${CX} ${APEX} V${APEX - 18}`, 2.4);
  ironPath(`M${CX} ${APEX - 28} V${APEX - 42}`, 1.6);
  shadow.appendChild(el('circle', { cx: CX + 0.8, cy: APEX - 21.4, r: 5, fill: 'rgba(32,57,43,0.30)', class: 'pane' }));
  iron.appendChild(el('circle', { cx: CX, cy: APEX - 23, r: 5, fill: '#FCFDF9', class: 'pane' }));

  /* wings */
  function wingIron(xOut, xIn) {
    const outTop = WING_WALL_TOP, inTop = WING_ROOF_INNER;
    ironPath(`M${xOut} ${G} V${outTop}`, 2.6);
    /* roof slope with a slight sag curve */
    const mx = (xOut + xIn) / 2, my = (outTop + inTop) / 2 - 8;
    ironPath(`M${xOut} ${outTop} Q${mx} ${my} ${xIn} ${inTop}`, 2.6);
    const wCols = 7, cw = (xIn - xOut) / wCols;
    for (let c = 1; c < wCols; c++) {
      const x = xOut + c * cw;
      const roofY = quadY(outTop, my, inTop, c / wCols);
      ironPath(`M${x.toFixed(1)} ${G} V${roofY.toFixed(1)}`, 1.3);
    }
    for (const y of [476, 538]) {
      ironPath(`M${Math.min(xOut, xIn)} ${y} H${Math.max(xOut, xIn)}`, 1.2);
    }
    /* eave brackets */
    ironPath(`M${xIn} ${inTop} V${SPRING + 24}`, 1.6);
  }
  wingIron(WING_L_OUT, HALL_L);
  wingIron(WING_R_OUT, HALL_R);

  /* cresting dots along the arch */
  for (let i = 1; i < 10; i++) {
    const a = Math.PI - (i / 10) * Math.PI;
    const px = CX + (RX + 7) * Math.cos(a), py = SPRING - (RY + 7) * Math.sin(a);
    const d = el('circle', { cx: px.toFixed(1), cy: py.toFixed(1), r: 1.8, fill: '#FCFDF9', class: 'pane' });
    panes.appendChild(el('circle', { cx: (px + 0.7).toFixed(1), cy: (py + 1.2).toFixed(1), r: 2, fill: 'rgba(32,57,43,0.25)', class: 'pane' }));
    iron.appendChild(d);
  }

  container.appendChild(svg);

  /* vine guides in stage coordinates: up a wall mullion, then along the arch */
  const guideLeft = [];
  guideLeft.push({ x: HALL_L + 6, y: G - 2 });
  guideLeft.push({ x: HALL_L + 5, y: SPRING + 10 });
  for (let a = Math.PI * 0.98; a > Math.PI * 0.52; a -= 0.045) {
    guideLeft.push({ x: CX + (RX - 8) * Math.cos(a), y: SPRING - (RY - 8) * Math.sin(a) });
  }
  const guideRight = [];
  guideRight.push({ x: WING_R_OUT - 5, y: G - 2 });
  guideRight.push({ x: WING_R_OUT - 6, y: WING_WALL_TOP + 4 });
  {
    const mx = (WING_R_OUT + HALL_R) / 2, my = (WING_WALL_TOP + WING_ROOF_INNER) / 2 - 8;
    for (let t = 0; t <= 1.001; t += 0.06) {
      const mt = 1 - t;
      guideRight.push({
        x: mt * mt * WING_R_OUT + 2 * mt * t * mx + t * t * HALL_R,
        y: (mt * mt * WING_WALL_TOP + 2 * mt * t * my + t * t * WING_ROOF_INNER) - 4,
      });
    }
  }

  return {
    svg,
    guides: { left: guideLeft, right: guideRight },
    floor: { y: G, hallL: HALL_L, hallR: HALL_R, wingLOut: WING_L_OUT, wingROut: WING_R_OUT },
  };
}
