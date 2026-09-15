/* LEGERDEMAIN — Wiener Hofkarten
   All 52 faces + back generated as inline SVG. House style: Vienna Secession
   portrait courts — flat geometric busts, gilt linework, bordeaux velvet. */

export const STOCK = '#F6F1E2';
export const STOCK_D = '#EDE5CE';
export const INK = '#1A1418';
export const CARMINE = '#B62C35';
export const GILT = '#C8A45E';
export const GILT_D = '#A6823F';
export const BORDEAUX = '#4E1B26';
export const BORDEAUX_D = '#39111B';

const SPADE =
  'M50 6C50 6 12 38 12 61C12 74 21 82 31 82C38 82 44 78 47 72C45 83 40 91 33 96L67 96C60 91 55 83 53 72C56 78 62 82 69 82C79 82 88 74 88 61C88 38 50 6 50 6Z';
const HEART =
  'M50 92C50 92 10 63 10 34C10 18 22 9 33 9C42 9 48 14 50 22C52 14 58 9 67 9C78 9 90 18 90 34C90 63 50 92 50 92Z';
const DIAMOND =
  'M50 4C61 22 73 37 86 50C73 63 61 78 50 96C39 78 27 63 14 50C27 37 39 22 50 4Z';
const CLUB =
  'M33 27a17 17 0 1 0 34 0 17 17 0 1 0-34 0ZM12 55a17 17 0 1 0 34 0 17 17 0 1 0-34 0ZM54 55a17 17 0 1 0 34 0 17 17 0 1 0-34 0ZM46 58C46 76 42 87 34 95L66 95C58 87 54 76 54 58Z';

export const SUITS = {
  s: { name: 'Spades', color: INK, red: false, path: SPADE },
  h: { name: 'Hearts', color: CARMINE, red: true, path: HEART },
  c: { name: 'Clubs', color: INK, red: false, path: CLUB },
  d: { name: 'Diamonds', color: CARMINE, red: true, path: DIAMOND },
};

export const RANK_NAMES = {
  A: 'Ace', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
  8: 'Eight', 9: 'Nine', 10: 'Ten', J: 'Jack', Q: 'Queen', K: 'King',
};

export const FULL_DECK = [];
for (const s of ['s', 'h', 'c', 'd'])
  for (const r of ['A', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K'])
    FULL_DECK.push({ rank: String(r), suit: s });

export function cardName({ rank, suit }) {
  return `the ${RANK_NAMES[rank]} of ${SUITS[suit].name}`;
}

/* one suit glyph, centred at (x,y), glyph box is 100×100 */
function pip(suit, x, y, s, inverted = 0, fill) {
  const rot = inverted ? ' rotate(180)' : '';
  return `<g transform="translate(${x} ${y})${rot} scale(${s}) translate(-50 -50)"><path d="${SUITS[suit].path}" fill="${fill || SUITS[suit].color}"/></g>`;
}

/* classical pip layouts — [col 0..1, row 0..1, inverted] */
const PIPS = {
  2: [[.5, 0, 0], [.5, 1, 1]],
  3: [[.5, 0, 0], [.5, .5, 0], [.5, 1, 1]],
  4: [[0, 0, 0], [1, 0, 0], [0, 1, 1], [1, 1, 1]],
  5: [[0, 0, 0], [1, 0, 0], [.5, .5, 0], [0, 1, 1], [1, 1, 1]],
  6: [[0, 0, 0], [1, 0, 0], [0, .5, 0], [1, .5, 0], [0, 1, 1], [1, 1, 1]],
  7: [[0, 0, 0], [1, 0, 0], [.5, .25, 0], [0, .5, 0], [1, .5, 0], [0, 1, 1], [1, 1, 1]],
  8: [[0, 0, 0], [1, 0, 0], [.5, .25, 0], [0, .5, 0], [1, .5, 0], [.5, .75, 1], [0, 1, 1], [1, 1, 1]],
  9: [[0, 0, 0], [1, 0, 0], [0, 1 / 3, 0], [1, 1 / 3, 0], [.5, .5, 0], [0, 2 / 3, 1], [1, 2 / 3, 1], [0, 1, 1], [1, 1, 1]],
  10: [[0, 0, 0], [1, 0, 0], [.5, 1 / 6, 0], [0, 1 / 3, 0], [1, 1 / 3, 0], [0, 2 / 3, 1], [1, 2 / 3, 1], [.5, 5 / 6, 1], [0, 1, 1], [1, 1, 1]],
};

function cornerIndex(rank, suit) {
  const c = SUITS[suit].color;
  const fs = rank === '10' ? 27 : 33;
  const one = `<text x="26" y="43" text-anchor="middle" font-family="'Bodoni Moda',serif" font-weight="640" font-size="${fs}" fill="${c}">${rank}</text>${pip(suit, 26, 62, .30)}`;
  return `<g>${one}</g><g transform="rotate(180 125 175)">${one}</g>`;
}

/* ————— Secession court busts (double-headed) ————— */
function courtHalf(rank, suit, uid) {
  const S = SUITS[suit];
  const primary = S.red ? CARMINE : INK;
  const hair = S.red ? BORDEAUX : INK;
  let o = '';
  /* portrait halo behind head */
  o += `<circle cx="125" cy="84" r="45" fill="none" stroke="${GILT}" stroke-width="2.2" opacity=".8"/>`;
  o += `<circle cx="125" cy="84" r="52" fill="none" stroke="${GILT}" stroke-width="1" opacity=".35"/>`;
  /* torso — hard-angled trapezoid; the mirrored halves fuse into a
     Secession lozenge, broken by a checker belt at the seam */
  const drape = 'M56 176 L56 158 L102 121 L148 121 L194 158 L194 176 Z';
  o += `<path d="${drape}" fill="${primary}"/>`;
  o += `<g clip-path="url(#${uid}d)">`;
  if (rank === 'K') {
    o += `<g fill="none" stroke="${GILT}" stroke-width="2.2" opacity=".92">`;
    for (const y of [136, 150, 164])
      o += `<path d="M50 ${y} L68 ${y - 9} L86 ${y} L104 ${y - 9} L122 ${y} L140 ${y - 9} L158 ${y} L176 ${y - 9} L194 ${y} L206 ${y - 9}"/>`;
    o += '</g>';
  } else if (rank === 'Q') {
    for (let gy = 129; gy <= 172; gy += 11)
      for (let gx = 54; gx <= 198; gx += 12)
        o += `<circle cx="${gx + (gy % 22 === 0 ? 6 : 0)}" cy="${gy}" r="1.9" fill="${GILT}" opacity=".92"/>`;
  } else {
    o += `<g stroke="${GILT}" stroke-width="2.4" opacity=".88">`;
    for (let gx = 58; gx <= 194; gx += 11) o += `<line x1="${gx}" y1="122" x2="${gx}" y2="176"/>`;
    o += '</g>';
  }
  o += '</g>';
  o += `<path d="${drape}" fill="none" stroke="${GILT_D}" stroke-width="1.6"/>`;
  /* jack keeps a card tucked at the hip */
  if (rank === 'J') {
    o += `<g transform="rotate(18 158 143)"><rect x="148" y="128" width="20" height="29" rx="3" fill="${STOCK}" stroke="${INK}" stroke-width="1.4"/><rect x="151.5" y="131.5" width="13" height="22" rx="1.5" fill="${BORDEAUX}"/><rect x="153.5" y="133.5" width="9" height="18" fill="none" stroke="${GILT}" stroke-width=".9"/></g>`;
  }
  /* checker belt across the seam (self-symmetric under the 180° mirror) */
  o += `<rect x="56" y="166" width="138" height="18" fill="${BORDEAUX}"/>`;
  for (const bc of [71, 89, 107, 125, 143, 161, 179])
    o += `<rect x="${bc - 4.5}" y="170.5" width="9" height="9" fill="${GILT}" opacity=".95"/>`;
  o += `<rect x="56" y="166" width="138" height="18" fill="none" stroke="${GILT}" stroke-width="1.4"/>`;
  /* collar */
  o += `<path d="M104 119 L146 119 L141 107 L109 107 Z" fill="${BORDEAUX}" stroke="${GILT}" stroke-width="1.3"/>`;
  /* head */
  o += `<circle cx="125" cy="82" r="28" fill="${STOCK}" stroke="${INK}" stroke-width="2.4"/>`;
  /* hair cap */
  o += `<path d="M97 82 A28 28 0 0 1 153 82 L143 82 A18 18 0 0 0 107 82 Z" fill="${hair}"/>`;
  /* face */
  o += `<circle cx="113" cy="84" r="2.6" fill="${INK}"/><circle cx="137" cy="84" r="2.6" fill="${INK}"/>`;
  o += `<path d="M106 76.5 L119 75" stroke="${INK}" stroke-width="1.9" stroke-linecap="round"/>`;
  o += `<path d="M131 75 L144 76.5" stroke="${INK}" stroke-width="1.9" stroke-linecap="round"/>`;
  if (rank === 'K') {
    o += `<path d="M110 95 Q118 102.5 125 96.5 Q132 102.5 140 95" fill="none" stroke="${hair}" stroke-width="3" stroke-linecap="round"/>`;
  } else {
    o += `<path d="M118 98 L132 98" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
  }
  /* headgear */
  if (rank === 'K') {
    o += `<polygon points="100,60 100,40 112,50 125,31 138,50 150,40 150,60" fill="${GILT}" stroke="${INK}" stroke-width="1.6"/>`;
    o += `<circle cx="100" cy="36" r="3" fill="${STOCK}" stroke="${INK}" stroke-width="1.2"/>`;
    o += `<circle cx="125" cy="26.5" r="3" fill="${STOCK}" stroke="${INK}" stroke-width="1.2"/>`;
    o += `<circle cx="150" cy="36" r="3" fill="${STOCK}" stroke="${INK}" stroke-width="1.2"/>`;
  } else if (rank === 'Q') {
    o += `<path d="M98 58 Q125 18 152 58 Z" fill="${BORDEAUX}" stroke="${GILT}" stroke-width="2.2"/>`;
    o += `<circle cx="111" cy="48" r="2.1" fill="${GILT}"/><circle cx="125" cy="38" r="2.5" fill="${GILT}"/><circle cx="139" cy="48" r="2.1" fill="${GILT}"/>`;
    o += `<path d="M98 58 C88 82 84 100 87 116" fill="none" stroke="${GILT}" stroke-width="1.6" opacity=".8"/>`;
    o += `<path d="M152 58 C162 82 166 100 163 116" fill="none" stroke="${GILT}" stroke-width="1.6" opacity=".8"/>`;
    o += `<circle cx="96" cy="93" r="3" fill="${GILT}"/><circle cx="154" cy="93" r="3" fill="${GILT}"/>`;
  } else {
    o += `<g transform="rotate(-9 125 51)"><ellipse cx="125" cy="51" rx="33" ry="13" fill="${BORDEAUX}" stroke="${INK}" stroke-width="2"/><path d="M92 51 L158 51" stroke="${GILT}" stroke-width="1.2" opacity=".7"/></g>`;
    o += `<path d="M154 57 L164 73" stroke="${GILT}" stroke-width="2"/><circle cx="165" cy="77" r="4" fill="${GILT}"/>`;
  }
  /* suit mark beside the head — traditional corner-of-panel position */
  o += pip(suit, 66, 55, .16);
  return o;
}

function courtArt(rank, suit, uid) {
  const half = courtHalf(rank, suit, uid);
  const drape = 'M56 176 L56 158 L102 121 L148 121 L194 158 L194 176 Z';
  return `
  <defs>
    <clipPath id="${uid}c"><rect x="41.2" y="47.2" width="167.6" height="127.6"/></clipPath>
    <clipPath id="${uid}d"><path d="${drape}"/></clipPath>
  </defs>
  <rect x="40" y="46" width="170" height="258" fill="${STOCK_D}"/>
  <g clip-path="url(#${uid}c)">${half}</g>
  <g transform="rotate(180 125 175)" clip-path="url(#${uid}c)">${half}</g>
  <line x1="41" y1="175" x2="209" y2="175" stroke="${GILT}" stroke-width="1.3"/>
  <rect x="40" y="46" width="170" height="258" fill="none" stroke="${GILT}" stroke-width="2"/>`;
}

let UID = 0;

export function frontSVG({ rank, suit }) {
  const uid = 'k' + (UID++).toString(36);
  let body = '';
  if (rank === 'A') {
    body = pip(suit, 125, 175, suit === 's' ? 1.05 : .95);
    if (suit === 's') {
      body += `<g transform="translate(125 175) scale(1.34) translate(-50 -50)"><path d="${SPADE}" fill="none" stroke="${GILT}" stroke-width="2.2"/></g>`;
      body += `<text x="125" y="300" text-anchor="middle" font-family="Jost,sans-serif" font-size="11.5" letter-spacing="3.4" fill="${GILT_D}">LEGERDEMAIN · WIEN</text>`;
    }
  } else if (PIPS[rank]) {
    const s = Number(rank) >= 9 ? .46 : .5;
    body = PIPS[rank].map(([cx, cy, inv]) =>
      pip(suit, 74 + cx * 102, 84 + cy * 182, s, inv)).join('');
  } else {
    body = courtArt(rank, suit, uid);
  }
  return `<svg viewBox="0 0 250 350" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="250" height="350" rx="14" fill="${STOCK}"/>
  <rect x="7" y="7" width="236" height="336" rx="9" fill="none" stroke="${GILT}" stroke-width="1" opacity=".55"/>
  ${cornerIndex(rank, suit)}${body}</svg>`;
}

export function backSVG() {
  const uid = 'b' + (UID++).toString(36);
  let ticks = '';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ticks += `<line x1="${125 + Math.cos(a) * 40}" y1="${175 + Math.sin(a) * 40}" x2="${125 + Math.cos(a) * 50}" y2="${175 + Math.sin(a) * 50}" stroke="${GILT}" stroke-width="1.3"/>`;
  }
  return `<svg viewBox="0 0 250 350" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><pattern id="${uid}g" width="16" height="16" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill="${GILT}" opacity=".14"/><rect x="8" y="8" width="8" height="8" fill="${GILT}" opacity=".14"/>
  </pattern></defs>
  <rect width="250" height="350" rx="14" fill="${STOCK}"/>
  <rect x="9" y="9" width="232" height="332" rx="9" fill="${BORDEAUX}"/>
  <rect x="20" y="20" width="210" height="310" fill="url(#${uid}g)"/>
  <rect x="20" y="20" width="210" height="310" fill="none" stroke="${GILT}" stroke-width="1.4"/>
  <circle cx="125" cy="175" r="66" fill="${BORDEAUX}"/>
  <circle cx="125" cy="175" r="64" fill="none" stroke="${GILT}" stroke-width="1.8"/>
  <circle cx="125" cy="175" r="56" fill="none" stroke="${GILT}" stroke-width=".9" stroke-dasharray="2 5"/>
  ${ticks}
  <circle cx="125" cy="175" r="31" fill="none" stroke="${GILT}" stroke-width="1.4"/>
  <text x="125" y="175" dy="15" text-anchor="middle" font-family="'Bodoni Moda',serif" font-style="italic" font-weight="600" font-size="46" fill="${GILT}">L</text>
  <g fill="none" stroke="${GILT}" stroke-width="1.1" opacity=".8">
    <path d="M20 62 A42 42 0 0 0 62 20"/><path d="M230 62 A42 42 0 0 1 188 20"/>
    <path d="M20 288 A42 42 0 0 1 62 330"/><path d="M230 288 A42 42 0 0 0 188 330"/>
  </g></svg>`;
}
