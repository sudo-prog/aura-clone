/* KINETIK — the four compositions. Each is a balance tree; every
   pivot is solved by the engine so the moments genuinely agree. */

import { PAL, leaf, hang, rod } from './engine.js';

const WHITE = '#FFFFFF';
const GREY_1 = '#9AA1AB';   // tide grey
const GREY_2 = '#C2C8CF';   // pale tide
const GREY_3 = '#7A828C';   // deep tide

/* ---- HERO — the studio mark. All four paints, one of each. ---- */
export const HERO = {
  drop: 54, ax: 0.66, fitW: 0.66, fitH: 0.84, maxScale: 1.2, intro: 1.0, install: true, hugPad: 30,
  root: rod(560, { pose: -3 },
    hang(70, rod(330, { pose: 4.5 },
      hang(92, leaf('disc', 34, PAL.iron)),
      hang(48, rod(215, { pose: -6.5 },
        hang(66, leaf('petal', 27, PAL.cobalt)),
        hang(100, leaf('disc', 22, PAL.sun)),
      )),
    )),
    hang(126, leaf('disc', 46, PAL.red)),
  ),
};

/* ---- MERIDIAN 2024 — long horizontal blades, red & black over white. ---- */
export const MERIDIAN = {
  drop: 250, ax: 0.40, fitW: 0.68, fitH: 0.82, maxScale: 1.25, intro: 0.55, hugPad: 72,
  root: rod(660, { pose: -2.5 },
    hang(64, rod(410, { pose: 3.5 },
      hang(88, leaf('blade', 27, PAL.iron)),
      hang(50, rod(270, { pose: -5 },
        hang(68, leaf('disc', 15, WHITE, { stroke: PAL.iron })),
        hang(44, rod(180, { pose: 6.5 },
          hang(58, leaf('blade', 16, PAL.red)),
          hang(84, leaf('blade', 12, PAL.iron)),
        )),
      )),
      [{ at: 0.56, link: hang(30, leaf('disc', 10, WHITE, { stroke: PAL.iron })) }],
    )),
    hang(112, leaf('blade', 33, PAL.red)),
    [{ at: 0.38, link: hang(36, leaf('disc', 12, WHITE, { stroke: PAL.iron })) }],
  ),
};

/* ---- SHALLOWS 2023 — cobalt & tide-grey plates, stepped like light
       falling through shallow water. ---- */
export const SHALLOWS = {
  drop: 120, ax: 0.62, fitW: 0.62, fitH: 0.86, maxScale: 1.2, intro: 0.6, hugPad: 72,
  root: rod(500, { pose: 2.5 },
    hang(58, leaf('disc', 30, PAL.cobalt)),
    hang(72, rod(400, { pose: -3.5 },
      hang(94, leaf('ring', 22, PAL.cobalt)),
      hang(46, rod(330, { pose: 4 },
        hang(62, leaf('disc', 19, GREY_1)),
        hang(52, rod(255, { pose: -5.5 },
          hang(74, leaf('disc', 15, PAL.cobalt)),
          hang(42, rod(185, { pose: 6.5 },
            hang(58, leaf('ring', 12, GREY_3)),
            hang(90, leaf('disc', 11, GREY_2, { stroke: '#8B929B' })),
          )),
          [{ at: 0.52, link: hang(24, leaf('disc', 8, PAL.cobalt)) }],
        )),
        [{ at: 0.5, link: hang(28, leaf('disc', 10, PAL.cobalt)) }],
      )),
      [{ at: 0.55, link: hang(26, leaf('disc', 9, GREY_1)) }],
    )),
    [{ at: 0.42, link: hang(32, leaf('disc', 12, GREY_2, { stroke: '#8B929B' })) }],
  ),
};

/* ---- SECOND SUMMER 2025 — one late sun countered by a spray of
       red petals and a black seed. ---- */
export const SECOND_SUMMER = {
  drop: 220, ax: 0.42, fitW: 0.64, fitH: 0.84, maxScale: 1.25, intro: 0.6, hugPad: 72,
  root: rod(620, { pose: -4 },
    hang(62, rod(370, { pose: 5 },
      hang(70, rod(240, { pose: -7 },
        hang(82, leaf('petal', 21, PAL.red)),
        hang(50, leaf('petal', 16, PAL.red)),
        [{ at: 0.55, link: hang(30, leaf('petal', 12, PAL.red)) }],
      )),
      hang(114, leaf('fin', 24, PAL.iron)),
    )),
    hang(98, leaf('disc', 52, PAL.sun)),
    [{ at: 0.34, link: hang(38, leaf('petal', 13, PAL.red)) }],
  ),
};

export const SCENES = {
  hero: HERO,
  meridian: MERIDIAN,
  shallows: SHALLOWS,
  'second-summer': SECOND_SUMMER,
};
